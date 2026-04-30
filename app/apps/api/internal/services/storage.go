package services

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// StorageService defines the interface for file storage.
type StorageService interface {
	UploadFile(file *multipart.FileHeader, targetPath string) (string, error)
	UploadLocalFile(localPath string, targetPath string) (string, error)
	DownloadFile(path string, targetLocalPath string) error
	DeleteFile(path string) error
	GetURL(path string) string
}

// LocalStorageService implements StorageService for local filesystem.
type LocalStorageService struct {
	BaseURL string
}

func (s *LocalStorageService) UploadFile(file *multipart.FileHeader, targetPath string) (string, error) {
	// Create directory if it doesn't exist
	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("creating directory: %w", err)
	}

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	dst, err := os.Create(targetPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}

	return targetPath, nil
}

func (s *LocalStorageService) UploadLocalFile(localPath string, targetPath string) (string, error) {
	if localPath == targetPath {
		return targetPath, nil
	}
	// Copy file if different
	src, err := os.Open(localPath)
	if err != nil {
		return "", err
	}
	defer src.Close()

	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	dst, err := os.Create(targetPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}
	return targetPath, nil
}

func (s *LocalStorageService) DownloadFile(path string, targetLocalPath string) error {
	if path == targetLocalPath {
		return nil
	}
	// Copy file
	src, err := os.Open(path)
	if err != nil {
		return err
	}
	defer src.Close()

	dir := filepath.Dir(targetLocalPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	dst, err := os.Create(targetLocalPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

func (s *LocalStorageService) DeleteFile(path string) error {
	return os.Remove(path)
}

func (s *LocalStorageService) GetURL(path string) string {
	return fmt.Sprintf("%s/%s", s.BaseURL, path)
}

// S3StorageService implements StorageService for S3-compatible storage (MinIO, SeaweedFS, etc).
type S3StorageService struct {
	Client    *minio.Client
	Bucket    string
	PublicURL string
}

func NewS3StorageService(endpoint, accessKey, secretKey, bucket string, useSSL bool, publicURL string) (*S3StorageService, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create s3 client: %w", err)
	}

	// Ensure bucket exists
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket existence: %w", err)
	}
	if !exists {
		err = client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create bucket: %w", err)
		}
		
		// Set public policy if needed
		policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetBucketLocation","s3:ListBucket"],"Resource":["arn:aws:s3:::%s"]},{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, bucket, bucket)
		err = client.SetBucketPolicy(ctx, bucket, policy)
		if err != nil {
			fmt.Printf("Warning: failed to set bucket policy: %v\n", err)
		}
	}

	return &S3StorageService{
		Client:    client,
		Bucket:    bucket,
		PublicURL: publicURL,
	}, nil
}

func (s *S3StorageService) UploadFile(file *multipart.FileHeader, targetPath string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	_, err = s.Client.PutObject(context.Background(), s.Bucket, targetPath, src, file.Size, minio.PutObjectOptions{
		ContentType: file.Header.Get("Content-Type"),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to s3: %w", err)
	}

	return targetPath, nil
}

func (s *S3StorageService) UploadLocalFile(localPath string, targetPath string) (string, error) {
	_, err := s.Client.FPutObject(context.Background(), s.Bucket, targetPath, localPath, minio.PutObjectOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to upload local file to s3: %w", err)
	}
	return targetPath, nil
}

func (s *S3StorageService) DownloadFile(path string, targetLocalPath string) error {
	// Create directory for targetLocalPath
	dir := filepath.Dir(targetLocalPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return s.Client.FGetObject(context.Background(), s.Bucket, path, targetLocalPath, minio.GetObjectOptions{})
}

func (s *S3StorageService) DeleteFile(path string) error {
	return s.Client.RemoveObject(context.Background(), s.Bucket, path, minio.RemoveObjectOptions{})
}

func (s *S3StorageService) GetURL(path string) string {
	if s.PublicURL != "" {
		return fmt.Sprintf("%s/%s", s.PublicURL, path)
	}
	return path
}
