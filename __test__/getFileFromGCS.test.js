const debug = require("debug")("app:startup");
const { Storage } = require("@google-cloud/storage");
const config = require("config");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const { getFilesFromGCS_Service } = require("../Services/getFilesFromGCS");
const { mockKeyFile: mockKeyConfig } = require("../mocConfig");

jest.mock("config");
jest.mock("@google-cloud/secret-manager");
jest.mock("@google-cloud/storage");
jest.mock("debug", () => jest.fn(() => jest.fn()));

describe("getFilesFromGCS_Service", () => {
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
      getFiles: jest.fn(),
    };
    const mockStorageClient = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    };
    Storage.mockImplementation(() => mockStorageClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should return the list of file names from GCS", async () => {
    const mockFiles = [
      { name: "file1.txt" },
      { name: "file2.txt" },
      { name: "file3.txt" },
    ];
    Storage().bucket().getFiles.mockResolvedValue([mockFiles]);

    const result = await getFilesFromGCS_Service();

    expect(SecretManagerServiceClient).toHaveBeenCalled();
    expect(Storage).toHaveBeenCalledWith({ credentials: mockKeyFile });
    expect(Storage().bucket).toHaveBeenCalledWith(mockConfig.bucketName);
    expect(Storage().bucket().getFiles).toHaveBeenCalled();

    expect(result).toEqual(["file1.txt", "file2.txt", "file3.txt"]);
  });

  it("should handle errors when retrieving files", async () => {
    const mockError = new Error("Test error");
    Storage().bucket().getFiles.mockRejectedValue(mockError);

    await expect(getFilesFromGCS_Service()).rejects.toThrow(mockError);

    expect(console.error).toHaveBeenCalledWith(
      "Error retrieving files:",
      mockError
    );
  });
});
