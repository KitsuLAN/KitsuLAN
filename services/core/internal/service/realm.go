package service

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/google/uuid"
)

type RealmService struct {
	repo repository.RealmRepository
	cfg  *config.Config
}

func NewRealmService(repo repository.RealmRepository, cfg *config.Config) *RealmService {
	return &RealmService{repo: repo, cfg: cfg}
}

func (s *RealmService) GetStatus(ctx context.Context) (bool, string, error) {
	const op = "RealmService.GetStatus"
	realm, err := s.repo.GetCurrent(ctx)
	if err != nil {
		if errors.Is(err, errors.ErrNotFound) {
			return false, "0.1.0", nil // Не инициализирован
		}
		return false, "", errors.Wrap(err, errors.ErrDBQueryFailed, op)
	}
	return realm != nil, "0.1.0", nil
}

func (s *RealmService) Setup(ctx context.Context, domain, displayName string) (*models.RealmConfig, error) {
	const op = "RealmService.Setup"

	// 1. Проверяем, не занято ли уже (Idempotency check)
	exists, _, _ := s.GetStatus(ctx)
	if exists {
		return nil, errors.New(errors.CodeConflict, "Realm already initialized", 6).
			WithOp(op).
			WithRemedy("To reset this realm, you must manually drop the database.")
	}

	// 2. Генерация ключей Ed25519 для Федерации
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrInternal, op).WithMsg("Failed to generate Ed25519 keys")
	}

	// 3. Шифрование приватного ключа
	// ВАЖНО: Мы используем JWT_SECRET как временный мастер-ключ,
	// но лучше завести отдельный KITSULAN_MASTER_KEY в .env
	encryptedPriv, err := s.encryptKey(priv)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrInternal, op).WithMsg("Failed to encrypt private key")
	}

	newRealmID, _ := uuid.NewV7()

	// 4. Создание конфига
	realm := &models.RealmConfig{
		BaseEntity: models.BaseEntity{
			ID:      newRealmID,
			RealmID: newRealmID,
		},
		Domain:           domain,
		DisplayName:      displayName,
		PubKeyEd25519:    pub,
		PrivKeyEncrypted: encryptedPriv, // TODO: Зашифровать мастер-ключом из .env
		KeyVersion:       1,
		FederationMode:   models.FederationModeOpen,
	}

	if err := s.repo.Create(ctx, realm); err != nil {
		return nil, errors.AsAppError(err).WithOp(op)
	}

	return realm, nil
}

// encryptKey — здесь должна быть логика AES-GCM шифрования.
// Для примера оставим пока заглушку, но в TODO запишем реализацию.
func (s *RealmService) encryptKey(key []byte) ([]byte, error) {
	// TODO: Реализовать AES-GCM шифрование с использованием s.cfg.MasterKey
	return key, nil
}
