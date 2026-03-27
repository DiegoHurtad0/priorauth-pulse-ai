from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    TINYFISH_API_KEY: str = ""
    MONGO_URI: str = ""
    AGENTOPS_API_KEY: str = ""
    COMPOSIO_API_KEY: str = ""
    PORT: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
