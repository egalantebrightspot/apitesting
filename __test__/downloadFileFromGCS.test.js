const debug = require("debug")("app:startup");
const { Storage } = require("@google-cloud/storage");
const config = require("config");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const {
  downloadFileFromGCS_Service,
} = require("../Services/downloadFileFromGCS");
const { mockKeyFile: mockKeyConfig } = require("../mocConfig");

jest.mock("config");
jest.mock("@google-cloud/secret-manager");
jest.mock("@google-cloud/storage");
jest.mock("debug", () => jest.fn(() => jest.fn()));

describe("downloadFileFromGCS_Service", () => {
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

  it("should download the most recent file matching the DID", async () => {
    const DID = "test-did";
    const mockFiles = [
      {
        metadata: {
          metadata: {
            DID: "test-did",
          },
        },
        updated: new Date("2022-01-01T12:00:00Z"),
        download: jest.fn().mockResolvedValue([Buffer.from("file content 1")]),
      },
      {
        metadata: {
          metadata: {
            DID: "test-did",
          },
        },
        updated: new Date("2023-01-01T12:00:00Z"),
        download: jest.fn().mockResolvedValue([Buffer.from("file content 2")]),
      },
    ];
    Storage().bucket().getFiles.mockResolvedValue([mockFiles]);

    const result = await downloadFileFromGCS_Service(DID);

    expect(SecretManagerServiceClient).toHaveBeenCalled();
    expect(Storage).toHaveBeenCalledWith({ credentials: mockKeyFile });
    expect(Storage().bucket).toHaveBeenCalledWith(mockConfig.bucketName);
    expect(Storage().bucket().getFiles).toHaveBeenCalledWith({
      prefix: `${DID}`,
    });

    const recentFile = mockFiles[1]; // most recent file based on updated date
    expect(recentFile.download).toHaveBeenCalled();
    expect(result).toEqual(Buffer.from("file content 2"));

    expect(debug).toHaveBeenCalledWith(
      `Downloaded ${DID} from ${mockConfig.bucketName}`
    );
  });

  it("should return null if no files are found with the DID", async () => {
    const DID = "test-did";
    Storage().bucket().getFiles.mockResolvedValue([[]]);

    const result = await downloadFileFromGCS_Service(DID);

    expect(Storage().bucket().getFiles).toHaveBeenCalledWith({
      prefix: `${DID}`,
    });
    expect(result).toBeNull();
    expect(debug).toHaveBeenCalledWith(
      `No Files matching the name ${DID} was found`
    );
  });

  it("should return null if no files match the metadata", async () => {
    const DID = "test-did";
    const mockFiles = [
      {
        metadata: {
          metadata: {
            DID: "other-did",
          },
        },
        updated: new Date("2022-01-01T12:00:00Z"),
        download: jest.fn(),
      },
    ];
    Storage().bucket().getFiles.mockResolvedValue([mockFiles]);

    const result = await downloadFileFromGCS_Service(DID);

    expect(Storage().bucket().getFiles).toHaveBeenCalledWith({
      prefix: `${DID}`,
    });
    expect(result).toBeNull();
    expect(debug).toHaveBeenCalledWith(
      `File ${DID} with the requested metadata not found`
    );
  });

  it("should handle errors when downloading files", async () => {
    const DID = "test-did";
    const mockError = new Error("Test error");
    Storage().bucket().getFiles.mockRejectedValue(mockError);

    await expect(downloadFileFromGCS_Service(DID)).rejects.toThrow(mockError);

    expect(console.error).toHaveBeenCalledWith(
      "Error downloading files:",
      mockError
    );
  });
});
