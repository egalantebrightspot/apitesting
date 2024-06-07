const debug = require("debug")("app:startup");
const { Storage } = require("@google-cloud/storage");
const config = require("config");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const {
  uploadFileToGCS_Put_Service,
} = require("../Services/uploadFileToGCS_Put");
const { mockKeyFile: mockKeyConfig } = require("../mocConfig");

jest.mock("config");
jest.mock("@google-cloud/secret-manager");
jest.mock("@google-cloud/storage");
jest.mock("debug", () => jest.fn(() => jest.fn()));

describe("uploadFileToGCS_Put_Service", () => {
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

    const mockFile = {
      createWriteStream: jest.fn(),
    };
    const mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
    };
    const mockStorageClient = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    };
    Storage.mockImplementation(() => mockStorageClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should upload the file to GCS with metadata", async () => {
    const fileStreamFromUser = { buffer: Buffer.from("file content") };
    const metadataFromUser = { DID: "test-did", otherMetadata: "test" };
    const mockWriteStream = {
      on: jest.fn((event, callback) => {
        if (event === "finish") {
          callback();
        }
      }),
      end: jest.fn(),
    };
    Storage()
      .bucket()
      .file()
      .createWriteStream.mockReturnValue(mockWriteStream);

    await uploadFileToGCS_Put_Service(fileStreamFromUser, metadataFromUser);

    expect(SecretManagerServiceClient).toHaveBeenCalled();
    expect(Storage).toHaveBeenCalledWith({ credentials: mockKeyFile });
    expect(Storage().bucket).toHaveBeenCalledWith(mockConfig.bucketName);
    expect(Storage().bucket().file).toHaveBeenCalledWith(metadataFromUser.DID);

    expect(mockWriteStream.end).toHaveBeenCalledWith(fileStreamFromUser.buffer);
    expect(mockWriteStream.on).toHaveBeenCalledWith(
      "finish",
      expect.any(Function)
    );
    expect(mockWriteStream.on).toHaveBeenCalledWith(
      "error",
      expect.any(Function)
    );

    const expectedMetadata = {
      metadata: {
        ...metadataFromUser,
        SomeConstantValue1: "WhateverConstantValueIsRequired1", // To remove eventually
        SomeConstantValue2: "WhateverConstantValueIsRequired2", // To remove eventually
        FileSize: `${fileStreamFromUser.buffer.length} bytes`,
      },
    };

    expect(Storage().bucket().file().createWriteStream).toHaveBeenCalledWith({
      metadata: expectedMetadata,
      resumable: false,
    });

    expect(debug).toHaveBeenCalledWith(
      `${metadataFromUser.DID} uploaded to ${mockConfig.bucketName} with its associated metadata`
    );
  });

  it("should handle errors when uploading files", async () => {
    const fileStreamFromUser = { buffer: Buffer.from("file content") };
    const metadataFromUser = { DID: "test-did", otherMetadata: "test" };
    const mockError = new Error("Test error");
    const mockWriteStream = {
      on: jest.fn((event, callback) => {
        if (event === "error") {
          callback(mockError);
        }
      }),
      end: jest.fn(),
    };
    Storage()
      .bucket()
      .file()
      .createWriteStream.mockReturnValue(mockWriteStream);

    await expect(
      uploadFileToGCS_Put_Service(fileStreamFromUser, metadataFromUser)
    ).rejects.toThrow(mockError);

    expect(console.error).toHaveBeenCalledWith(
      "Error uploading files:",
      mockError
    );
  });
});
