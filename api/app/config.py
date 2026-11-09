from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    es_url: str = ""
    es_api_key: str = ""
    openai_api_key: str = ""
    # Comma-separated browser origins allowed to call the API. The default is the local Next.js dev server.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # When set, organizer actions (announce / fix / summary) need this value in the X-Organizer-Key header.
    # Unset means open, which is fine for a local demo and wrong for a public deployment.
    organizer_key: str = ""


settings = Settings()
