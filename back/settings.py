from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Oracle
    ORACLE_HOST: str
    ORACLE_PORT: int
    ORACLE_SERVICE: str | None = None
    ORACLE_SERVICE_NAME: str | None = None
    ORACLE_USER: str
    ORACLE_PASSWORD: str
    ORACLE_POOL_MIN: int = 1
    ORACLE_POOL_MAX: int = 5
    ORACLE_POOL_INC: int = 1
    ORACLE_CLIENT_LIB_DIR: str

    # LLM / Ollama
    OLLAMA_BASE: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "gemma3-summarizer"

    # File storage
    UPLOAD_DIR: str = "./uploads"
    RESULTS_DIR: str = "./results"
    UPLOADS_DIR: str | None = None
    OUTPUTS_DIR: str | None = None

    # Server & CORS
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str | list[str] = "http://localhost:5173,http://127.0.0.1:5173"
    SERVER_PORT: int = 4000

    # Logging / Debug
    LOG_LEVEL: str = "INFO"
    ENABLE_DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    # ✅ property 기반 접근 (BaseSettings 내부 속성 안전하게 노출)
    @property
    def oracle_host(self): return self.ORACLE_HOST

    @property
    def oracle_port(self): return self.ORACLE_PORT

    @property
    def oracle_service_name(self):
        return self.ORACLE_SERVICE_NAME or self.ORACLE_SERVICE

    @property
    def oracle_user(self): return self.ORACLE_USER

    @property
    def oracle_password(self): return self.ORACLE_PASSWORD

    @property
    def oracle_client_lib_dir(self): return self.ORACLE_CLIENT_LIB_DIR

    @property
    def upload_dir(self):
        return self.UPLOADS_DIR or self.UPLOAD_DIR

    @property
    def results_dir(self):
        return self.OUTPUTS_DIR or self.RESULTS_DIR

    @property
    def cors_origins(self):
        if isinstance(self.CORS_ORIGINS, str):
            return [x.strip() for x in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS


settings = Settings()

if settings.ENABLE_DEBUG:
    print(".env loaded")
    print(f"Oracle: {settings.oracle_host}:{settings.oracle_port}/{settings.oracle_service_name}")
    print(f"Ollama: {settings.OLLAMA_BASE} ({settings.OLLAMA_MODEL})")
    print(f"Uploads: {settings.upload_dir}")
    print(f"Port: {settings.SERVER_PORT}")
