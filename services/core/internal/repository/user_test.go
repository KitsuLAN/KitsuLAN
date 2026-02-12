package repository_test

import (
	"context"
	"testing"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// newTestDB создаёт изолированную SQLite in-memory БД для каждого теста.
// Каждый вызов — отдельная БД, тесты не влияют друг на друга.
func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&domain.User{}); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}
	t.Cleanup(func() {
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	return db
}

// makeUser создаёт тестового пользователя с разумными дефолтами.
func makeUser(username string) *domain.User {
	return &domain.User{
		Username:     username,
		PasswordHash: "$2a$10$test-hash-placeholder",
	}
}

// --- Tests ---

func TestUserRepository_Create(t *testing.T) {
	repo := repository.NewUserRepository(newTestDB(t))
	ctx := context.Background()

	t.Run("creates user and assigns UUIDv7", func(t *testing.T) {
		user := makeUser("alice")
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if user.ID.String() == "00000000-0000-0000-0000-000000000000" {
			t.Error("expected non-nil UUID after create")
		}
	})

	t.Run("returns ErrUsernameConflict on duplicate username", func(t *testing.T) {
		u1 := makeUser("bob")
		if err := repo.Create(ctx, u1); err != nil {
			t.Fatalf("first create failed: %v", err)
		}

		u2 := makeUser("bob")
		err := repo.Create(ctx, u2)
		if !domainerr.Is(err, domainerr.ErrUsernameConflict) {
			t.Errorf("expected ErrUsernameConflict, got: %v", err)
		}
	})
}

func TestUserRepository_FindByUsername(t *testing.T) {
	repo := repository.NewUserRepository(newTestDB(t))
	ctx := context.Background()

	user := makeUser("charlie")
	_ = repo.Create(ctx, user)

	t.Run("finds existing user case-insensitively", func(t *testing.T) {
		found, err := repo.FindByUsername(ctx, "CHARLIE")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if found.Username != "charlie" {
			t.Errorf("expected username 'charlie', got %q", found.Username)
		}
	})

	t.Run("returns ErrUserNotFound for unknown user", func(t *testing.T) {
		_, err := repo.FindByUsername(ctx, "nobody")
		if !domainerr.Is(err, domainerr.ErrUserNotFound) {
			t.Errorf("expected ErrUserNotFound, got: %v", err)
		}
	})
}

func TestUserRepository_Update(t *testing.T) {
	repo := repository.NewUserRepository(newTestDB(t))
	ctx := context.Background()

	user := makeUser("dave")
	_ = repo.Create(ctx, user)

	t.Run("updates allowed fields", func(t *testing.T) {
		err := repo.Update(ctx, user.ID.String(), map[string]any{
			"avatar_url": "https://cdn.example.com/avatar.png",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		updated, _ := repo.FindByID(ctx, user.ID.String())
		if updated.AvatarURL != "https://cdn.example.com/avatar.png" {
			t.Errorf("avatar_url not updated, got: %q", updated.AvatarURL)
		}
	})

	t.Run("ignores forbidden fields (id, password_hash)", func(t *testing.T) {
		originalHash := user.PasswordHash
		err := repo.Update(ctx, user.ID.String(), map[string]any{
			"password_hash": "hacked",
			"id":            "00000000-0000-0000-0000-000000000000",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		updated, _ := repo.FindByID(ctx, user.ID.String())
		if updated.PasswordHash != originalHash {
			t.Error("password_hash should not be updatable via Update()")
		}
	})

	t.Run("returns ErrUserNotFound for unknown id", func(t *testing.T) {
		err := repo.Update(ctx, "00000000-0000-0000-0000-000000000001", map[string]any{
			"avatar_url": "x",
		})
		if !domainerr.Is(err, domainerr.ErrUserNotFound) {
			t.Errorf("expected ErrUserNotFound, got: %v", err)
		}
	})
}

func TestUserRepository_Delete(t *testing.T) {
	repo := repository.NewUserRepository(newTestDB(t))
	ctx := context.Background()

	user := makeUser("eve")
	_ = repo.Create(ctx, user)

	t.Run("soft-deletes user", func(t *testing.T) {
		if err := repo.Delete(ctx, user.ID.String()); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// После soft-delete FindByID не должен находить запись
		_, err := repo.FindByID(ctx, user.ID.String())
		if !domainerr.Is(err, domainerr.ErrUserNotFound) {
			t.Errorf("expected ErrUserNotFound after delete, got: %v", err)
		}
	})

	t.Run("returns ErrUserNotFound for unknown id", func(t *testing.T) {
		err := repo.Delete(ctx, "00000000-0000-0000-0000-000000000002")
		if !domainerr.Is(err, domainerr.ErrUserNotFound) {
			t.Errorf("expected ErrUserNotFound, got: %v", err)
		}
	})
}

func TestUserRepository_Search(t *testing.T) {
	db := newTestDB(t)
	repo := repository.NewUserRepository(db)
	ctx := context.Background()

	for _, name := range []string{"frank_x", "frank_y", "george"} {
		_ = repo.Create(ctx, makeUser(name))
	}

	t.Run("finds users by partial match", func(t *testing.T) {
		results, err := repo.Search(ctx, "frank", 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 2 {
			t.Errorf("expected 2 results, got %d", len(results))
		}
	})

	t.Run("respects limit", func(t *testing.T) {
		results, err := repo.Search(ctx, "frank", 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 1 {
			t.Errorf("expected 1 result with limit=1, got %d", len(results))
		}
	})

	t.Run("returns empty slice for no matches", func(t *testing.T) {
		results, err := repo.Search(ctx, "zzznomatch", 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 0 {
			t.Errorf("expected empty result, got %d", len(results))
		}
	})
}

func TestUserRepository_ExistsByUsername(t *testing.T) {
	repo := repository.NewUserRepository(newTestDB(t))
	ctx := context.Background()

	_ = repo.Create(ctx, makeUser("hannah"))

	t.Run("returns true for existing username", func(t *testing.T) {
		exists, err := repo.ExistsByUsername(ctx, "hannah")
		if err != nil || !exists {
			t.Errorf("expected exists=true, got exists=%v err=%v", exists, err)
		}
	})

	t.Run("returns false for unknown username", func(t *testing.T) {
		exists, err := repo.ExistsByUsername(ctx, "nobody")
		if err != nil || exists {
			t.Errorf("expected exists=false, got exists=%v err=%v", exists, err)
		}
	})
}
