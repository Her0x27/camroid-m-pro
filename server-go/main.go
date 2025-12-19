package main

import (
        "compress/gzip"
        "encoding/json"
        "flag"
        "fmt"
        "io"
        "log"
        "mime"
        "mime/multipart"
        "net/http"
        "net/url"
        "os"
        "path/filepath"
        "strings"
        "sync"
        "time"
)

var (
        Version   = "1.1.0"
        BuildTime = "unknown"
)

type Config struct {
        Port          string
        Host          string
        StaticDir     string
        EnableGzip    bool
        EnableCache   bool
        CacheMaxAge   int
        EnableLogging bool
}

type OriginValidationConfig struct {
        Mode            string   `json:"mode"`
        AllowedHosts    []string `json:"allowedHosts"`
        AllowedPatterns []string `json:"allowedPatterns"`
        AllowedSchemes  []string `json:"allowedSchemes"`
}

type AppConfig struct {
        PrivacyMode        bool                   `json:"PRIVACY_MODE"`
        SelectedModule     string                 `json:"SELECTED_MODULE"`
        ModuleUnlockValues map[string]string      `json:"MODULE_UNLOCK_VALUES"`
        UnlockGesture      string                 `json:"UNLOCK_GESTURE"`
        UnlockPattern      string                 `json:"UNLOCK_PATTERN"`
        UnlockFingers      int                    `json:"UNLOCK_FINGERS"`
        AutoLockMinutes    int                    `json:"AUTO_LOCK_MINUTES"`
        DebugMode          bool                   `json:"DEBUG_MODE"`
        AllowedProxyHosts  []string               `json:"ALLOWED_PROXY_HOSTS"`
        OriginValidation   OriginValidationConfig `json:"ORIGIN_VALIDATION"`
}

var (
        appConfig     AppConfig
        appConfigLock sync.RWMutex
        configPath    string
)

type gzipResponseWriter struct {
        io.Writer
        http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
        return w.Writer.Write(b)
}

var gzipWriterPool = sync.Pool{
        New: func() interface{} {
                return gzip.NewWriter(nil)
        },
}

type responseWriter struct {
        http.ResponseWriter
        statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
        rw.statusCode = code
        rw.ResponseWriter.WriteHeader(code)
}

func loggerMiddleware(next http.Handler, enabled bool) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                if !enabled {
                        next.ServeHTTP(w, r)
                        return
                }

                start := time.Now()
                rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
                next.ServeHTTP(rw, r)
                duration := time.Since(start)

                log.Printf("%s %s %d %v", r.Method, r.URL.Path, rw.statusCode, duration)
        })
}

func gzipMiddleware(next http.Handler, enabled bool) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                if !enabled {
                        next.ServeHTTP(w, r)
                        return
                }

                if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
                        next.ServeHTTP(w, r)
                        return
                }

                ext := filepath.Ext(r.URL.Path)
                skipGzip := map[string]bool{
                        ".png": true, ".jpg": true, ".jpeg": true, ".gif": true,
                        ".webp": true, ".ico": true, ".woff": true, ".woff2": true,
                        ".mp4": true, ".webm": true, ".zip": true, ".gz": true,
                }
                if skipGzip[ext] {
                        next.ServeHTTP(w, r)
                        return
                }

                gz := gzipWriterPool.Get().(*gzip.Writer)
                defer gzipWriterPool.Put(gz)

                gz.Reset(w)
                defer gz.Close()

                w.Header().Set("Content-Encoding", "gzip")
                w.Header().Del("Content-Length")

                next.ServeHTTP(gzipResponseWriter{Writer: gz, ResponseWriter: w}, r)
        })
}

func cacheMiddleware(next http.Handler, enabled bool, maxAge int) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                if !enabled {
                        next.ServeHTTP(w, r)
                        return
                }

                if strings.HasPrefix(r.URL.Path, "/api/") {
                        w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
                        next.ServeHTTP(w, r)
                        return
                }

                ext := filepath.Ext(r.URL.Path)

                switch ext {
                case ".html", "":
                        w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
                        w.Header().Set("Pragma", "no-cache")
                        w.Header().Set("Expires", "0")
                case ".js", ".css":
                        if strings.Contains(r.URL.Path, "/assets/") {
                                w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, immutable", maxAge))
                        } else {
                                w.Header().Set("Cache-Control", "public, max-age=3600")
                        }
                case ".json":
                        if r.URL.Path == "/config.json" {
                                w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
                        } else {
                                w.Header().Set("Cache-Control", "public, max-age=3600")
                        }
                case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico":
                        w.Header().Set("Cache-Control", "public, max-age=86400")
                case ".woff", ".woff2", ".ttf", ".eot":
                        w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAge))
                default:
                        w.Header().Set("Cache-Control", "public, max-age=3600")
                }

                next.ServeHTTP(w, r)
        })
}

func securityMiddleware(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("X-Content-Type-Options", "nosniff")
                w.Header().Set("X-Frame-Options", "DENY")
                w.Header().Set("X-XSS-Protection", "1; mode=block")
                w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
                w.Header().Set("Permissions-Policy", "camera=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)")

                next.ServeHTTP(w, r)
        })
}

func corsMiddleware(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                origin := r.Header.Get("Origin")
                if origin != "" {
                        w.Header().Set("Access-Control-Allow-Origin", origin)
                        w.Header().Set("Access-Control-Allow-Credentials", "true")
                }

                if r.Method == "OPTIONS" {
                        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
                        w.Header().Set("Access-Control-Max-Age", "86400")
                        w.WriteHeader(http.StatusNoContent)
                        return
                }

                next.ServeHTTP(w, r)
        })
}

func loadAppConfig(path string) error {
        appConfigLock.Lock()
        defer appConfigLock.Unlock()

        data, err := os.ReadFile(path)
        if err != nil {
                appConfig = AppConfig{
                        PrivacyMode:        false,
                        SelectedModule:     "game-2048",
                        ModuleUnlockValues: map[string]string{"calculator": "123456=", "notepad": "secret", "game-2048": ""},
                        UnlockGesture:      "severalFingers",
                        UnlockPattern:      "0-4-8-5",
                        UnlockFingers:      4,
                        AutoLockMinutes:    5,
                        DebugMode:          false,
                        AllowedProxyHosts:  []string{"api.imgbb.com", "api.imgur.com", "api.cloudinary.com"},
                        OriginValidation: OriginValidationConfig{
                                Mode:            "disabled",
                                AllowedHosts:    []string{},
                                AllowedPatterns: []string{},
                                AllowedSchemes:  []string{"https", "http"},
                        },
                }
                return nil
        }

        if err := json.Unmarshal(data, &appConfig); err != nil {
                return err
        }

        if appConfig.OriginValidation.Mode == "" {
                appConfig.OriginValidation = OriginValidationConfig{
                        Mode:            "disabled",
                        AllowedHosts:    []string{},
                        AllowedPatterns: []string{},
                        AllowedSchemes:  []string{"https", "http"},
                }
        }

        return nil
}

func saveAppConfig(path string) error {
        appConfigLock.RLock()
        data, err := json.MarshalIndent(appConfig, "", "  ")
        appConfigLock.RUnlock()

        if err != nil {
                return err
        }

        return os.WriteFile(path, data, 0644)
}

func isHostAllowed(targetHost string) bool {
        appConfigLock.RLock()
        defer appConfigLock.RUnlock()

        for _, allowed := range appConfig.AllowedProxyHosts {
                if strings.EqualFold(targetHost, allowed) {
                        return true
                }
        }
        return false
}

func matchHostPattern(host, pattern string) bool {
        if strings.HasPrefix(pattern, "*.") {
                suffix := pattern[1:]
                return strings.HasSuffix(host, suffix) || host == pattern[2:]
        }
        return strings.EqualFold(host, pattern)
}

func validateOrigin(r *http.Request) bool {
        appConfigLock.RLock()
        config := appConfig.OriginValidation
        appConfigLock.RUnlock()

        if config.Mode == "disabled" {
                return true
        }

        origin := r.Header.Get("Origin")
        referer := r.Header.Get("Referer")

        if origin == "" && referer == "" {
                return false
        }

        host := r.Host
        host = strings.TrimSuffix(host, ":443")
        host = strings.TrimSuffix(host, ":80")

        var originHost string
        var originScheme string

        if origin != "" {
                originURL, err := url.Parse(origin)
                if err != nil {
                        return false
                }
                originHost = originURL.Host
                originScheme = originURL.Scheme
        } else if referer != "" {
                refererURL, err := url.Parse(referer)
                if err != nil {
                        return false
                }
                originHost = refererURL.Host
                originScheme = refererURL.Scheme
        }

        originHost = strings.TrimSuffix(originHost, ":443")
        originHost = strings.TrimSuffix(originHost, ":80")

        if len(config.AllowedSchemes) > 0 {
                schemeAllowed := false
                for _, s := range config.AllowedSchemes {
                        if strings.EqualFold(originScheme, s) {
                                schemeAllowed = true
                                break
                        }
                }
                if !schemeAllowed {
                        return false
                }
        }

        switch config.Mode {
        case "same-host":
                return strings.EqualFold(originHost, host)

        case "host-whitelist":
                for _, allowed := range config.AllowedHosts {
                        if strings.EqualFold(originHost, allowed) {
                                return true
                        }
                }
                return false

        case "pattern-whitelist":
                for _, pattern := range config.AllowedPatterns {
                        if matchHostPattern(originHost, pattern) {
                                return true
                        }
                }
                return false

        default:
                log.Printf("Warning: Unknown ORIGIN_VALIDATION mode '%s', rejecting request (fail-closed)", config.Mode)
                return false
        }
}

func handleConfigGet(w http.ResponseWriter, r *http.Request) {
        appConfigLock.RLock()
        defer appConfigLock.RUnlock()

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(appConfig)
}

func handleConfigPost(w http.ResponseWriter, r *http.Request) {
        var updates map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
                http.Error(w, "Invalid JSON", http.StatusBadRequest)
                return
        }

        appConfigLock.Lock()

        if v, ok := updates["PRIVACY_MODE"].(bool); ok {
                appConfig.PrivacyMode = v
        }
        if v, ok := updates["SELECTED_MODULE"].(string); ok {
                appConfig.SelectedModule = v
        }
        if v, ok := updates["UNLOCK_GESTURE"].(string); ok {
                appConfig.UnlockGesture = v
        }
        if v, ok := updates["UNLOCK_PATTERN"].(string); ok {
                appConfig.UnlockPattern = v
        }
        if v, ok := updates["UNLOCK_FINGERS"].(float64); ok {
                appConfig.UnlockFingers = int(v)
        }
        if v, ok := updates["AUTO_LOCK_MINUTES"].(float64); ok {
                appConfig.AutoLockMinutes = int(v)
        }
        if v, ok := updates["DEBUG_MODE"].(bool); ok {
                appConfig.DebugMode = v
        }
        if v, ok := updates["MODULE_UNLOCK_VALUES"].(map[string]interface{}); ok {
                for key, val := range v {
                        if strVal, ok := val.(string); ok {
                                appConfig.ModuleUnlockValues[key] = strVal
                        }
                }
        }

        appConfigLock.Unlock()

        if err := saveAppConfig(configPath); err != nil {
                log.Printf("Failed to save config: %v", err)
        }

        handleConfigGet(w, r)
}

func handleImgBBUpload(w http.ResponseWriter, r *http.Request) {
        if r.Method != "POST" {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        if !validateOrigin(r) {
                http.Error(w, "Forbidden: Invalid origin", http.StatusForbidden)
                return
        }

        if !isHostAllowed("api.imgbb.com") {
                http.Error(w, "Forbidden: ImgBB not in whitelist", http.StatusForbidden)
                return
        }

        var req struct {
                Image      string `json:"image"`
                APIKey     string `json:"apiKey"`
                Expiration int    `json:"expiration"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid JSON", http.StatusBadRequest)
                return
        }

        if req.APIKey == "" {
                http.Error(w, "API key required", http.StatusBadRequest)
                return
        }

        body := &strings.Builder{}
        writer := multipart.NewWriter(body)
        writer.WriteField("image", req.Image)
        writer.Close()

        uploadURL := fmt.Sprintf("https://api.imgbb.com/1/upload?key=%s", req.APIKey)
        if req.Expiration > 0 {
                uploadURL += fmt.Sprintf("&expiration=%d", req.Expiration)
        }

        httpReq, err := http.NewRequest("POST", uploadURL, strings.NewReader(body.String()))
        if err != nil {
                http.Error(w, "Failed to create request", http.StatusInternalServerError)
                return
        }
        httpReq.Header.Set("Content-Type", writer.FormDataContentType())

        client := &http.Client{Timeout: 60 * time.Second}
        resp, err := client.Do(httpReq)
        if err != nil {
                http.Error(w, "ImgBB request failed: "+err.Error(), http.StatusBadGateway)
                return
        }
        defer resp.Body.Close()

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(resp.StatusCode)
        io.Copy(w, resp.Body)
}

func handleProxy(w http.ResponseWriter, r *http.Request) {
        if r.Method != "POST" {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        if !validateOrigin(r) {
                http.Error(w, "Forbidden: Invalid origin", http.StatusForbidden)
                return
        }

        var proxyReq struct {
                URL     string            `json:"url"`
                Method  string            `json:"method"`
                Headers map[string]string `json:"headers"`
                Body    string            `json:"body"`
        }

        if err := json.NewDecoder(r.Body).Decode(&proxyReq); err != nil {
                http.Error(w, "Invalid JSON", http.StatusBadRequest)
                return
        }

        targetURL, err := url.Parse(proxyReq.URL)
        if err != nil {
                http.Error(w, "Invalid URL", http.StatusBadRequest)
                return
        }

        if !isHostAllowed(targetURL.Host) {
                http.Error(w, "Forbidden: Host not in whitelist", http.StatusForbidden)
                return
        }

        method := proxyReq.Method
        if method == "" {
                method = "GET"
        }

        var bodyReader io.Reader
        if proxyReq.Body != "" {
                bodyReader = strings.NewReader(proxyReq.Body)
        }

        req, err := http.NewRequest(method, proxyReq.URL, bodyReader)
        if err != nil {
                http.Error(w, "Failed to create request", http.StatusInternalServerError)
                return
        }

        for key, value := range proxyReq.Headers {
                req.Header.Set(key, value)
        }

        client := &http.Client{Timeout: 30 * time.Second}
        resp, err := client.Do(req)
        if err != nil {
                http.Error(w, "Proxy request failed: "+err.Error(), http.StatusBadGateway)
                return
        }
        defer resp.Body.Close()

        for key, values := range resp.Header {
                for _, value := range values {
                        w.Header().Add(key, value)
                }
        }

        w.Header().Del("Access-Control-Allow-Origin")
        w.Header().Del("Access-Control-Allow-Credentials")

        w.WriteHeader(resp.StatusCode)
        io.Copy(w, resp.Body)
}

func handleHealthCheck(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
                "status":  "ok",
                "version": Version,
                "backend": true,
        })
}

type apiHandler struct {
        staticPath string
}

func (h apiHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
        switch {
        case r.URL.Path == "/api/health":
                handleHealthCheck(w, r)
        case r.URL.Path == "/api/config":
                switch r.Method {
                case "GET":
                        handleConfigGet(w, r)
                case "POST":
                        handleConfigPost(w, r)
                default:
                        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                }
        case r.URL.Path == "/api/imgbb":
                handleImgBBUpload(w, r)
        case r.URL.Path == "/api/proxy":
                handleProxy(w, r)
        default:
                http.NotFound(w, r)
        }
}

type ManifestIcon struct {
        Src     string   `json:"src"`
        Sizes   string   `json:"sizes"`
        Type    string   `json:"type"`
        Purpose string   `json:"purpose"`
}

type PWAManifest struct {
        Name            string          `json:"name"`
        ShortName       string          `json:"short_name"`
        Version         string          `json:"version"`
        Description     string          `json:"description"`
        StartURL        string          `json:"start_url"`
        Display         string          `json:"display"`
        Orientation     string          `json:"orientation"`
        BackgroundColor string          `json:"background_color"`
        ThemeColor      string          `json:"theme_color"`
        Icons           []ManifestIcon  `json:"icons"`
        Categories      []string        `json:"categories"`
        Lang            string          `json:"lang"`
        Dir             string          `json:"dir"`
}

type spaHandler struct {
        staticPath string
        indexPath  string
        apiHandler apiHandler
}

func generateManifestJSON() PWAManifest {
        appConfigLock.RLock()
        privacyMode := appConfig.PrivacyMode
        selectedModule := appConfig.SelectedModule
        appConfigLock.RUnlock()

        // Module data mapping
        modules := map[string]map[string]interface{}{
                "game-2048": {
                        "name":        "Game 2048",
                        "shortName":   "Game 2048",
                        "description": "Простая, но затягивающая головоломка. Соединяйте плитки, чтобы собрать 2048 и наслаждайтесь бесконечными испытаниями.",
                        "icon":        "game-icon",
                        "categories":  []string{"games", "productivity"},
                },
                "calculator": {
                        "name":        "Calculator",
                        "shortName":   "Calculator",
                        "description": "Simple and elegant calculator for everyday calculations. Fast, accurate, and easy to use.",
                        "icon":        "calculator-icon",
                        "categories":  []string{"productivity", "utilities"},
                },
                "notepad": {
                        "name":        "Notepad",
                        "shortName":   "Notepad",
                        "description": "Simple notepad for quick notes and reminders. Keep your thoughts organized and accessible.",
                        "icon":        "notepad-icon",
                        "categories":  []string{"productivity", "utilities"},
                },
        }

        // Select module data
        var moduleData map[string]interface{}
        iconBaseName := "favicon"

        if privacyMode && selectedModule != "" && modules[selectedModule] != nil {
                moduleData = modules[selectedModule]
                iconBaseName = moduleData["icon"].(string)
        } else {
                // Default Camroid M manifest
                moduleData = map[string]interface{}{
                        "name":        "Camroid M",
                        "shortName":   "Camroid M",
                        "description": "Tactical camera with GPS, compass and precision overlays. Capture geotagged photos for fieldwork and surveying.",
                        "categories":  []string{"photography", "utilities"},
                }
                iconBaseName = "favicon"
        }

        // Build icons array
        icons := []ManifestIcon{
                {
                        Src:     "/" + iconBaseName + ".svg",
                        Sizes:   "any",
                        Type:    "image/svg+xml",
                        Purpose: "any",
                },
                {
                        Src:     "/" + iconBaseName + ".png",
                        Sizes:   "192x192",
                        Type:    "image/png",
                        Purpose: "any maskable",
                },
                {
                        Src:     "/" + iconBaseName + "-ios.svg",
                        Sizes:   "any",
                        Type:    "image/svg+xml",
                        Purpose: "any",
                },
                {
                        Src:     "/" + iconBaseName + "-android.svg",
                        Sizes:   "any",
                        Type:    "image/svg+xml",
                        Purpose: "any",
                },
        }

        categories := []string{"productivity"}
        if val, ok := moduleData["categories"]; ok {
                if catList, ok := val.([]string); ok {
                        categories = catList
                }
        }

        return PWAManifest{
                Name:            moduleData["name"].(string),
                ShortName:       moduleData["shortName"].(string),
                Version:         "1.0.0",
                Description:     moduleData["description"].(string),
                StartURL:        "/",
                Display:         "fullscreen",
                Orientation:     "portrait",
                BackgroundColor: "#0a0a0a",
                ThemeColor:      "#0a0a0a",
                Icons:           icons,
                Categories:      categories,
                Lang:            "en",
                Dir:             "ltr",
        }
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
        // Handle manifest.json dynamically
        if r.URL.Path == "/manifest.json" {
                w.Header().Set("Content-Type", "application/manifest+json")
                w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
                w.Header().Set("Pragma", "no-cache")
                w.Header().Set("Expires", "0")
                
                manifest := generateManifestJSON()
                json.NewEncoder(w).Encode(manifest)
                return
        }

        if strings.HasPrefix(r.URL.Path, "/api/") {
                h.apiHandler.ServeHTTP(w, r)
                return
        }

        requestPath := filepath.Clean(r.URL.Path)

        requestPath = strings.TrimPrefix(requestPath, "/")
        requestPath = strings.TrimPrefix(requestPath, string(filepath.Separator))

        if requestPath == "" || requestPath == "." || requestPath == string(filepath.Separator) {
                http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
                return
        }

        fullPath := filepath.Join(h.staticPath, requestPath)

        relPath, err := filepath.Rel(h.staticPath, fullPath)
        if err != nil || strings.HasPrefix(relPath, "..") || filepath.IsAbs(relPath) {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
        }

        fi, err := os.Stat(fullPath)
        if os.IsNotExist(err) {
                http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
                return
        }

        if err != nil {
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
                return
        }

        if fi.IsDir() {
                indexFile := filepath.Join(fullPath, "index.html")
                if _, err := os.Stat(indexFile); err == nil {
                        fullPath = indexFile
                } else {
                        http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
                        return
                }
        }

        ext := filepath.Ext(fullPath)
        mimeType := mime.TypeByExtension(ext)
        if mimeType != "" {
                w.Header().Set("Content-Type", mimeType)
        }

        http.ServeFile(w, r, fullPath)
}

func main() {
        config := Config{}

        flag.StringVar(&config.Port, "port", getEnv("PORT", "5000"), "Server port")
        flag.StringVar(&config.Host, "host", getEnv("HOST", "0.0.0.0"), "Server host")
        flag.StringVar(&config.StaticDir, "static", getEnv("STATIC_DIR", "./public"), "Static files directory")
        flag.BoolVar(&config.EnableGzip, "gzip", true, "Enable gzip compression")
        flag.BoolVar(&config.EnableCache, "cache", true, "Enable cache headers")
        flag.IntVar(&config.CacheMaxAge, "cache-max-age", 31536000, "Cache max age in seconds")
        flag.BoolVar(&config.EnableLogging, "logging", true, "Enable request logging")

        showVersion := flag.Bool("version", false, "Show version")
        flag.Parse()

        if *showVersion {
                fmt.Printf("Camroid M Server v%s (built: %s)\n", Version, BuildTime)
                os.Exit(0)
        }

        staticDir, err := filepath.Abs(config.StaticDir)
        if err != nil {
                log.Fatalf("Invalid static directory: %v", err)
        }

        if _, err := os.Stat(staticDir); os.IsNotExist(err) {
                log.Fatalf("Static directory not found: %s", staticDir)
        }

        indexPath := filepath.Join(staticDir, "index.html")
        if _, err := os.Stat(indexPath); os.IsNotExist(err) {
                log.Fatalf("index.html not found in: %s", staticDir)
        }

        configPath = filepath.Join(staticDir, "config.json")
        if err := loadAppConfig(configPath); err != nil {
                log.Printf("Warning: Could not load config.json: %v", err)
        }

        handler := spaHandler{
                staticPath: staticDir,
                indexPath:  "index.html",
                apiHandler: apiHandler{staticPath: staticDir},
        }

        var h http.Handler = handler
        h = corsMiddleware(h)
        h = securityMiddleware(h)
        h = cacheMiddleware(h, config.EnableCache, config.CacheMaxAge)
        h = gzipMiddleware(h, config.EnableGzip)
        h = loggerMiddleware(h, config.EnableLogging)

        server := &http.Server{
                Addr:         fmt.Sprintf("%s:%s", config.Host, config.Port),
                Handler:      h,
                ReadTimeout:  15 * time.Second,
                WriteTimeout: 60 * time.Second,
                IdleTimeout:  60 * time.Second,
        }

        log.Printf("Camroid M Server v%s", Version)
        log.Printf("Serving files from: %s", staticDir)
        log.Printf("Config file: %s", configPath)
        log.Printf("Listening on %s:%s", config.Host, config.Port)
        log.Printf("Gzip: %v | Cache: %v | Logging: %v", config.EnableGzip, config.EnableCache, config.EnableLogging)

        if err := server.ListenAndServe(); err != nil {
                log.Fatal(err)
        }
}

func getEnv(key, defaultValue string) string {
        if value := os.Getenv(key); value != "" {
                return value
        }
        return defaultValue
}
