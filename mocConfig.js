const mockKeyFile = {
  type: "service_account",
  project_id: "my-project",
  private_key_id: "some_key_id",
  private_key: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  client_email: "my-service-account@my-project.iam.gserviceaccount.com",
  client_id: "some_client_id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/my-service-account%40my-project.iam.gserviceaccount.com",
};

module.exports = {
  mockKeyFile: mockKeyFile,
};
