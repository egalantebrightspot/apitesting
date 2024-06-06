const debug = require("debug")("app:startup");
const { Storage } = require("@google-cloud/storage");
const config = require("config");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const { deleteFileFromGCS_Service } = require("../Services/deleteFileFromGCS");

jest.mock("config");
jest.mock("@google-cloud/secret-manager");
jest.mock("@google-cloud/storage");
jest.mock("debug", () => jest.fn(() => jest.fn()));

describe("deleteFileFromGCS_Service", () => {
  const mockConfig = {
    secretResourceNameForServiceAccountKeyContentsForAccessingGcpBucket:
      "../latest",
    bucketName: "my-bucket",
  };

  const mockKeyFile = {
    type: "service_account",
    project_id: "my-project",
    private_key_id: "some_key_id",
    private_key:
      "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    client_email: "my-service-account@my-project.iam.gserviceaccount.com",
    client_id: "some_client_id",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/my-service-account%40my-project.iam.gserviceaccount.com",
  };

  beforeEach(() => {
    config.get.mockImplementation((key) => mockConfig[key]);

    const mockSecretManagerClient = {
      accessSecretVersion: jest
        .fn()
        .mockResolvedValue([
          { payload: { data: Buffer.from(JSON.stringify(mockKeyFile)) } },
        ]),
    };
    SecretManagerServiceClient.mockImplementation(
      () => mockSecretManagerClient
    );

    const mockBucket = {
      file: jest.fn().mockReturnValue({
        delete: jest.fn().mockResolvedValue(),
      }),
    };
    const mockStorageClient = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    };
    Storage.mockImplementation(() => mockStorageClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should delete the file from GCS", async () => {
    const filename = "test-file.txt";

    await deleteFileFromGCS_Service(filename);

    expect(SecretManagerServiceClient).toHaveBeenCalled();
    expect(Storage).toHaveBeenCalledWith({ credentials: mockKeyFile });
    expect(Storage().bucket).toHaveBeenCalledWith(mockConfig.bucketName);
    expect(Storage().bucket().file).toHaveBeenCalledWith(filename);
    expect(Storage().bucket().file().delete).toHaveBeenCalled();

    expect(debug).toHaveBeenCalledWith(
      `File ${filename} deleted from ${mockConfig.bucketName}`
    );
  });
});