package main

import (
	"log"
	"os"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/handlers"
	"github.com/KitsuLAN/KitsuLAN/services/core/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// 1. Подключение к БД
	dsn := os.Getenv("DB_URL")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 2. Миграции
	db.AutoMigrate(&models.User{})

	// 3. Инициализация хендлеров
	authHandler := &handlers.AuthHandler{DB: db}

	// 4. Роутер
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Или "http://localhost:34115" (порт Wails)
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Публичные маршруты
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
	}

	// Приватные маршруты (требуют токен)
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		api.GET("/me", func(c *gin.Context) {
			userID, _ := c.Get("user_id")
			c.JSON(200, gin.H{"message": "You are authorized!", "user_id": userID})
		})
		// TODO: Сюда позже добавить генерацию токена LiveKit
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
