use chrono::naive::NaiveDateTime;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApiKey {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub key_hash: String,
    pub prefix: String,
    pub permissions: serde_json::Value,
    pub target_url: Option<String>,
    pub last_used_at: Option<NaiveDateTime>,
    pub expires_at: Option<NaiveDateTime>,
    pub is_active: Option<bool>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize)]
pub struct ApiKeyResponse {
    pub id: Uuid,
    pub name: String,
    pub prefix: String,
    pub target_url: Option<String>,
    pub is_active: bool,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: Option<String>,
    pub target_url: Option<String>,
    pub permissions: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: Option<String>,
    pub target_url: Option<String>,
    pub permissions: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}
