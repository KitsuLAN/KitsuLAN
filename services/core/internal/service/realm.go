package service

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"io"
	"os"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
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
	if s.cfg.MasterKey == "" {
		keyBytes := make([]byte, 32)
		if _, err := io.ReadFull(rand.Reader, keyBytes); err != nil {
			return nil, errors.Wrap(err, errors.ErrInternal, op).WithMsg("Failed to generate master key")
		}
		s.cfg.MasterKey = hex.EncodeToString(keyBytes)
	}

	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrInternal, op).WithMsg("Failed to generate Ed25519 keys")
	}

	// 3. Шифрование приватного ключа
	encryptedPriv, err := s.encryptKey(priv, s.cfg.MasterKey)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrInternal, op).WithMsg("Failed to encrypt private key")
	}

	newRealmID, _ := uuid.NewV7()
	s.cfg.RealmID = newRealmID.String()

	if err := s.saveEnvConfig(); err != nil {
		return nil, errors.Wrap(err, errors.ErrInternal, op).WithMsg("Failed to persist config to .env file")
	}

	// 4. Создание конфига
	realm := &models.RealmConfig{
		BaseEntity: models.BaseEntity{
			ID:      newRealmID,
			RealmID: newRealmID,
		},
		Domain:           domain,
		DisplayName:      displayName,
		PubKeyEd25519:    pub,
		PrivKeyEncrypted: encryptedPriv,
		KeyVersion:       1,
		FederationMode:   models.FederationModeOpen,
	}

	if err := s.repo.Create(ctx, realm); err != nil {
		return nil, errors.AsAppError(err).WithOp(op)
	}

	return realm, nil
}

// encryptKey реализует AES-GCM шифрование
func (s *RealmService) encryptKey(key []byte, masterKeyHex string) ([]byte, error) {
	masterKey, err := hex.DecodeString(masterKeyHex)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(masterKey)
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// ciphertext = nonce + encrypted_data (склеиваем для удобства дешифровки)
	ciphertext := aesGCM.Seal(nonce, nonce, key, nil)
	return ciphertext, nil
}

// saveEnvConfig читает текущий .env и дописывает (или перезаписывает) в него RealmID и MasterKey
func (s *RealmService) saveEnvConfig() error {
	envMap, err := godotenv.Read(".env")
	if err != nil {
		if os.IsNotExist(err) {
			envMap = make(map[string]string)
		} else {
			return err
		}
	}

	envMap["APP_REALM_ID"] = s.cfg.RealmID
	envMap["APP_MASTER_KEY"] = s.cfg.MasterKey

	return godotenv.Write(envMap, ".env")
}
