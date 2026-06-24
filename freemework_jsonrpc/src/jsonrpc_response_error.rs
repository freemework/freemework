use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct JsonRpcResponseErrorMessage {
    #[serde(flatten)]
    version: super::jsonrpc_version::JsonRpcVersion,

    pub error: JsonRpcError,
    pub id: Option<Value>,
}

impl JsonRpcResponseErrorMessage {
    pub fn new(error: JsonRpcError, id: Option<serde_json::Value>) -> Self {
        Self {
            version: super::jsonrpc_version::JsonRpcVersion::default(),
            error,
            id,
        }
    }
}

impl TryFrom<&[u8]> for JsonRpcResponseErrorMessage {
    type Error = serde_json::Error;

    fn try_from(bytes: &[u8]) -> Result<Self, Self::Error> {
        serde_json::from_slice(bytes)
    }
}

impl TryInto<Vec<u8>> for JsonRpcResponseErrorMessage {
    type Error = serde_json::Error;

    fn try_into(self) -> Result<Vec<u8>, Self::Error> {
        serde_json::to_vec(&self)
    }
}

impl TryInto<String> for JsonRpcResponseErrorMessage {
    type Error = serde_json::Error;

    fn try_into(self) -> Result<String, Self::Error> {
        serde_json::to_string_pretty(&self)
    }
}

#[derive(Clone, PartialEq, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,

    pub message: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JsonRpcErrorCode {
    /// Invalid JSON was received by the server.
    /// An error occurred on the server while parsing the JSON text.
    ParseError,

    /// The JSON sent is not a valid Request object.
    InvalidRequest,

    /// The method does not exist / is not available.
    MethodNotFound,

    /// Invalid method parameter(s).
    InvalidParams,

    /// Internal JSON-RPC error.
    InternalError,
}

impl JsonRpcErrorCode {
    pub const fn code(self) -> i32 {
        match self {
            JsonRpcErrorCode::ParseError => -32700,
            JsonRpcErrorCode::InvalidRequest => -32600,
            JsonRpcErrorCode::MethodNotFound => -32601,
            JsonRpcErrorCode::InvalidParams => -32602,
            JsonRpcErrorCode::InternalError => -32603,
        }
    }

    pub const fn message(self) -> &'static str {
        match self {
            JsonRpcErrorCode::ParseError => "Parse error",
            JsonRpcErrorCode::InvalidRequest => "Invalid Request",
            JsonRpcErrorCode::MethodNotFound => "Method not found",
            JsonRpcErrorCode::InvalidParams => "Invalid params",
            JsonRpcErrorCode::InternalError => "Internal error",
        }
    }

    pub fn to_json_rpc_error(&self) -> JsonRpcError {
        JsonRpcError {
            code: self.code(),
            message: self.message().to_string(),
            data: None,
        }
    }
}

impl fmt::Debug for JsonRpcError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("JsonRpcError")
            .field("code", &self.code)
            .field("message", &self.message)
            .finish()
    }
}

impl TryFrom<&[u8]> for JsonRpcError {
    type Error = serde_json::Error;

    fn try_from(bytes: &[u8]) -> Result<Self, Self::Error> {
        serde_json::from_slice(bytes)
    }
}

impl TryInto<Vec<u8>> for JsonRpcError {
    type Error = serde_json::Error;

    fn try_into(self) -> Result<Vec<u8>, Self::Error> {
        serde_json::to_vec(&self)
    }
}
