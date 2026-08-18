package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/MehulxVentures/calories-automation/internals/config"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidToken = errors.New("invalid or expired token")

type AuthService struct{ secret []byte }

type claims struct {
	Subject   string `json:"sub"`
	ExpiresAt int64  `json:"exp"`
	IssuedAt  int64  `json:"iat"`
}

func NewAuthService(cfg config.Config) *AuthService {
	return &AuthService{secret: []byte(cfg.JWTSecret)}
}

func (s *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

func (s *AuthService) VerifyPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func (s *AuthService) CreateToken(userID string) (string, error) {
	now := time.Now()
	header, _ := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	payload, err := json.Marshal(claims{Subject: userID, IssuedAt: now.Unix(), ExpiresAt: now.Add(7 * 24 * time.Hour).Unix()})
	if err != nil {
		return "", fmt.Errorf("marshal token: %w", err)
	}
	unsigned := encode(header) + "." + encode(payload)
	return unsigned + "." + s.sign(unsigned), nil
}

func (s *AuthService) ParseToken(token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || !hmac.Equal([]byte(parts[2]), []byte(s.sign(parts[0]+"."+parts[1]))) {
		return "", ErrInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", ErrInvalidToken
	}
	var c claims
	if json.Unmarshal(payload, &c) != nil || c.Subject == "" || time.Now().Unix() >= c.ExpiresAt {
		return "", ErrInvalidToken
	}
	return c.Subject, nil
}

func (s *AuthService) sign(value string) string {
	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(value))
	return encode(mac.Sum(nil))
}

func encode(value []byte) string { return base64.RawURLEncoding.EncodeToString(value) }
