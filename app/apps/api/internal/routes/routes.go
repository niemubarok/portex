package routes

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/MUKE-coder/gin-docs/gindocs"
	"github.com/MUKE-coder/gorm-studio/studio"
	"github.com/MUKE-coder/pulse/pulse"
	"github.com/MUKE-coder/sentinel"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"app/apps/api/internal/ai"
	"app/apps/api/internal/cache"
	"app/apps/api/internal/config"
	"app/apps/api/internal/handlers"
	"app/apps/api/internal/mail"
	"app/apps/api/internal/middleware"
	"app/apps/api/internal/models"
	"app/apps/api/internal/jobs"
	"app/apps/api/internal/services"
	"app/apps/api/internal/storage"
)

// Services holds all Phase 4 services for dependency injection.
type Services struct {
	Cache   *cache.Cache
	Storage *storage.Storage
	Mailer  *mail.Mailer
	AI      *ai.AI
	Jobs    *jobs.Client
}

// Setup configures all routes and returns the Gin engine.
func Setup(db *gorm.DB, cfg *config.Config, svc *Services) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global middleware
	r.Use(middleware.Maintenance())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.MaxBodySize(100 << 20)) // 100MB max request body
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(middleware.Gzip())

	r.POST("/api/test-upload", func(c *gin.Context) {
		log.Printf("[TEST] Received Content-Length: %d", c.Request.ContentLength)
		if err := c.Request.ParseMultipartForm(100 << 20); err != nil {
			log.Printf("[TEST] Error: %v", err)
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "Success!"})
	})

	// Run auto-migration
	if err := models.Migrate(db); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Mount Sentinel security suite (WAF, rate limiting, auth shield, anomaly detection)
	if false && cfg.SentinelEnabled {
		// In development, use relaxed rate limits so devs don't get blocked while testing
		isDev := cfg.AppEnv == "development"
		ipLimit := &sentinel.Limit{Requests: 100, Window: 1 * time.Minute}
		routeLimits := map[string]sentinel.Limit{
			"/api/auth/login":    {Requests: 5, Window: 15 * time.Minute},
			"/api/auth/register": {Requests: 3, Window: 15 * time.Minute},
		}
		if isDev {
			ipLimit = &sentinel.Limit{Requests: 1000, Window: 1 * time.Minute}
			routeLimits = map[string]sentinel.Limit{
				"/api/auth/login":    {Requests: 100, Window: 1 * time.Minute},
				"/api/auth/register": {Requests: 100, Window: 1 * time.Minute},
			}
		}

		sentinel.Mount(r, db, sentinel.Config{
			Dashboard: sentinel.DashboardConfig{
				Username:  cfg.SentinelUsername,
				Password:  cfg.SentinelPassword,
				SecretKey: cfg.SentinelSecretKey,
			},
			WAF: sentinel.WAFConfig{
				Enabled: true,
				Mode: func() sentinel.WAFMode {
					if isDev { return sentinel.ModeLog }
					return sentinel.ModeBlock
				}(),
			},
			RateLimit: sentinel.RateLimitConfig{
				Enabled: !isDev, // Disabled in development, enabled in production
				ByIP:    ipLimit,
				ByRoute: routeLimits,
			},
			AuthShield: sentinel.AuthShieldConfig{
				Enabled:    !isDev, // Disabled in development
				LoginRoute: "/api/auth/login",
			},
			Anomaly: sentinel.AnomalyConfig{
				Enabled: !isDev, // Disabled in development
			},
			Geo: sentinel.GeoConfig{
				Enabled: !isDev, // Disabled in development
			},
		})
		log.Println("Sentinel security suite mounted at /sentinel")
	}

	// Mount GORM Studio
	if cfg.GORMStudioEnabled {
		studioCfg := studio.Config{
			Prefix: "/studio",
		}
		if cfg.GORMStudioUsername != "" && cfg.GORMStudioPassword != "" {
			studioCfg.AuthMiddleware = gin.BasicAuth(gin.Accounts{
				cfg.GORMStudioUsername: cfg.GORMStudioPassword,
			})
		}
		studio.Mount(r, db, []interface{}{&models.User{}, &models.Upload{}, &models.Blog{}, /* grit:studio */}, studioCfg)
		log.Println("GORM Studio mounted at /studio")
	}

	// API Documentation (gin-docs — auto-generated from routes + models)
	gindocs.Mount(r, db, gindocs.Config{
		Title:       cfg.AppName + " API",
		Description: "REST API built with [Grit](https://gritframework.dev) — Go + React meta-framework.",
		Version:     "1.0.0",
		UI:          gindocs.UIScalar,
		ScalarTheme: "kepler",
		Models:      []interface{}{&models.User{}, &models.Upload{}, &models.Blog{}},
		Auth: gindocs.AuthConfig{
			Type:         gindocs.AuthBearer,
			BearerFormat: "JWT",
		},
	})
	log.Println("API docs available at /docs")

	// Mount Pulse observability (request tracing, DB monitoring, runtime metrics, error tracking)
	if false && cfg.PulseEnabled {
		p := pulse.Mount(r, db, pulse.Config{
			AppName: cfg.AppName,
			DevMode: cfg.IsDevelopment(),
			Dashboard: pulse.DashboardConfig{
				Username: cfg.PulseUsername,
				Password: cfg.PulsePassword,
			},
			Tracing: pulse.TracingConfig{
				ExcludePaths: []string{"/studio/*", "/sentinel/*", "/docs/*", "/pulse/*"},
			},
			Alerts: pulse.AlertConfig{},
			Prometheus: pulse.PrometheusConfig{
				Enabled: true,
			},
		})

		// Register health checks for connected services
		if svc.Cache != nil {
			p.AddHealthCheck(pulse.HealthCheck{
				Name:     "redis",
				Type:     "redis",
				Critical: false,
				CheckFunc: func(ctx context.Context) error {
					return svc.Cache.Client().Ping(ctx).Err()
				},
			})
		}

		log.Println("Pulse observability mounted at /pulse")
	}

	// Auth service
	authService := &services.AuthService{
		Secret:        cfg.JWTSecret,
		AccessExpiry:  cfg.JWTAccessExpiry,
		RefreshExpiry: cfg.JWTRefreshExpiry,
	}

	// Handlers
	authHandler := &handlers.AuthHandler{
		DB:          db,
		AuthService: authService,
		Config:      cfg,
	}
	userHandler := &handlers.UserHandler{
		DB: db,
	}
	uploadHandler := &handlers.UploadHandler{
		DB:      db,
		Storage: svc.Storage,
		Jobs:    svc.Jobs,
	}
	aiHandler := &handlers.AIHandler{
		AI: svc.AI,
	}
	jobsHandler := &handlers.JobsHandler{
		RedisURL: cfg.CACHE_REDIS_URL,
	}
	cronHandler := &handlers.CronHandler{}
	blogHandler := handlers.NewBlogHandler(db)
	uiRegistryHandler := handlers.NewUIRegistryHandler(db, cfg.AppURL)
	totpHandler := &handlers.TOTPHandler{
		DB:          db,
		AuthService: authService,
		Issuer:      cfg.TOTPIssuer,
	}
	
	// Legacy handlers
	auditService := &services.AuditService{DB: db}
	pdfService := &services.PDFService{}
	
	// Initialize correct storage service for documents
	var storageSvc services.StorageService
	if cfg.Storage.Driver == "minio" || cfg.Storage.Driver == "s3" || cfg.Storage.Driver == "r2" || cfg.Storage.Driver == "b2" {
		var err error
		storageSvc, err = services.NewS3StorageService(
			cfg.Storage.Endpoint,
			cfg.Storage.AccessKey,
			cfg.Storage.SecretKey,
			cfg.Storage.Bucket,
			cfg.Storage.UseSSL,
			cfg.Storage.PublicURL,
		)
		if err != nil {
			log.Printf("Warning: failed to initialize S3 storage service, falling back to local: %v", err)
			storageSvc = &services.LocalStorageService{BaseURL: cfg.AppURL}
		}
	} else {
		storageSvc = &services.LocalStorageService{BaseURL: cfg.AppURL}
	}

	documentHandler := &handlers.DocumentHandler{
		DB:         db,
		AuditSvc:   auditService,
		PDFSvc:     pdfService,
		StorageSvc: storageSvc,
		Config:     cfg,
	}
	auditLogHandler := &handlers.AuditLogHandler{DB: db}
	settingHandler := &handlers.SettingHandler{DB: db}
	// grit:handlers

	// Health check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"version": "0.1.0",
		})
	})

	// Public Grit UI component registry (shadcn-compatible)
	r.GET("/r.json", uiRegistryHandler.GetRegistry)
	r.GET("/r/:name", uiRegistryHandler.GetComponent)

	// Public blog routes (no auth required)
	blogs := r.Group("/api/blogs")
	{
		blogs.GET("", blogHandler.ListPublished)
		blogs.GET("/:slug", blogHandler.GetBySlug)
	}

	// Public auth routes
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)
	}

	// OAuth2 social login
	oauth := auth.Group("/oauth")
	{
		oauth.GET("/:provider", authHandler.OAuthBegin)
		oauth.GET("/:provider/callback", authHandler.OAuthCallback)
	}

	// TOTP verification (public — uses pending tokens, not JWT)
	auth.POST("/totp/verify", totpHandler.Verify)
	auth.POST("/totp/backup-codes/verify", totpHandler.VerifyBackupCode)

	// Public verification route
	r.GET("/verify/:id", documentHandler.Verify)

	// Protected routes
	protected := r.Group("/api")
	protected.Use(middleware.Auth(db, authService))
	{
		protected.GET("/auth/me", authHandler.Me)
		protected.POST("/auth/logout", authHandler.Logout)

		// Two-Factor Authentication (TOTP)
		protected.POST("/auth/totp/setup", totpHandler.Setup)
		protected.POST("/auth/totp/enable", totpHandler.Enable)
		protected.POST("/auth/totp/disable", totpHandler.Disable)
		protected.GET("/auth/totp/status", totpHandler.Status)
		protected.POST("/auth/totp/backup-codes", totpHandler.RegenerateBackupCodes)
		protected.DELETE("/auth/totp/trusted-devices", totpHandler.RevokeTrustedDevices)

		// User routes (authenticated)
		protected.GET("/users/:id", userHandler.GetByID)

		// File uploads
		protected.POST("/uploads", uploadHandler.Create)
		protected.POST("/uploads/presign", uploadHandler.Presign)
		protected.POST("/uploads/complete", uploadHandler.CompleteUpload)
		protected.GET("/uploads", uploadHandler.List)
		protected.GET("/uploads/:id", uploadHandler.GetByID)
		protected.DELETE("/uploads/:id", uploadHandler.Delete)

		// AI
		protected.POST("/ai/complete", aiHandler.Complete)
		protected.POST("/ai/chat", aiHandler.Chat)
		protected.POST("/ai/stream", aiHandler.Stream)

		// Grit UI component registry (authenticated browse)
		protected.GET("/ui-components", uiRegistryHandler.ListComponents)
		protected.GET("/ui-components/:name", uiRegistryHandler.GetComponentDetail)

		// Documents (Export Sales)
		protected.GET("/documents", documentHandler.List)
		protected.GET("/documents/:id", documentHandler.GetByID)
		protected.POST("/documents", documentHandler.Create)
		protected.PUT("/documents/:id", documentHandler.Update)
		protected.POST("/documents/:id/approve", documentHandler.Approve)
		protected.POST("/documents/:id/lock", documentHandler.Approve)
		protected.GET("/documents/:id/download", documentHandler.Download)

		// Audit Logs (Restricted to Admin & Auditor)
		auditLogs := protected.Group("/audit_logs")
		auditLogs.Use(middleware.RequireRole("ADMIN", "AUDITOR", "MANAGER", "OFFICER"))
		{
			auditLogs.GET("", auditLogHandler.List)
			auditLogs.GET("/:id", auditLogHandler.GetByID)
		}

		// Settings (Read-only for all logged in users)
		protected.GET("/settings", settingHandler.GetList)

		// grit:routes:protected
	}

	// Profile routes (any authenticated user)
	profile := protected.Group("/profile")
	{
		profile.GET("", userHandler.GetProfile)
		profile.PUT("", userHandler.UpdateProfile)
		profile.DELETE("", userHandler.DeleteProfile)
	}

	// Admin routes
	admin := r.Group("/api")
	admin.Use(middleware.Auth(db, authService))
	admin.Use(middleware.RequireRole("ADMIN"))
	{
		admin.GET("/users", userHandler.List)
		admin.POST("/users", userHandler.Create)
		admin.PUT("/users/:id", userHandler.Update)
		admin.DELETE("/users/:id", userHandler.Delete)

		// Admin system routes
		admin.GET("/admin/jobs/stats", jobsHandler.Stats)
		admin.GET("/admin/jobs/:status", jobsHandler.ListByStatus)
		admin.POST("/admin/jobs/:id/retry", jobsHandler.Retry)
		admin.DELETE("/admin/jobs/queue/:queue", jobsHandler.ClearQueue)
		admin.GET("/admin/cron/tasks", cronHandler.ListTasks)

		// Blog management (admin)
		admin.GET("/admin/blogs", blogHandler.List)
		admin.POST("/admin/blogs", blogHandler.Create)
		admin.PUT("/admin/blogs/:id", blogHandler.Update)
		admin.DELETE("/admin/blogs/:id", blogHandler.Delete)

		// Grit UI component registry (admin management)
		admin.POST("/admin/ui-components", uiRegistryHandler.CreateComponent)
		admin.PUT("/admin/ui-components/:name", uiRegistryHandler.UpdateComponent)
		admin.DELETE("/admin/ui-components/:name", uiRegistryHandler.DeleteComponent)

		admin.DELETE("/documents/:id", documentHandler.Delete)
		admin.DELETE("/audit_logs/:id", auditLogHandler.Delete)

		// Settings (Admin write access)
		admin.PUT("/settings", settingHandler.Update)

		// grit:routes:admin
	}

	// Custom role-restricted routes
	// grit:routes:custom

	return r
}
