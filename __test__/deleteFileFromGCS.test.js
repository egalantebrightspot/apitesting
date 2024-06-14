const debug = require("debug")("app:startup");
const { Storage } = require("@google-cloud/storage");
const config = require("config");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const { deleteFileFromGCS_Service } = require("../Services/deleteFileFromGCS");
const { mockKeyFile: mockKeyConfig } = require("../mocConfig");

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

  const mockKeyFile = mockKeyConfig;

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
