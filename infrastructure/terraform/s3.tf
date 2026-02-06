# S3 Bucket for Backups
resource "aws_s3_bucket" "backups" {
  bucket = "vytalwatch-backups-${var.environment}"

  tags = {
    Name        = "vytalwatch-backups-${var.environment}"
    Purpose     = "Backups"
    Compliance  = "HIPAA"
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.vytalwatch.arn
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Lifecycle Policy
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555 # 7 years for HIPAA compliance
    }
  }

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# S3 Bucket for File Uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "vytalwatch-uploads-${var.environment}"

  tags = {
    Name        = "vytalwatch-uploads-${var.environment}"
    Purpose     = "UserUploads"
    Compliance  = "HIPAA"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.vytalwatch.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = "vytalwatch-terraform-state"

  tags = {
    Name    = "vytalwatch-terraform-state"
    Purpose = "TerraformState"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# DynamoDB for Terraform State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "vytalwatch-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name    = "vytalwatch-terraform-locks"
    Purpose = "TerraformStateLocking"
  }
}

# CloudWatch Alarms for S3
resource "aws_cloudwatch_metric_alarm" "s3_4xx_errors" {
  alarm_name          = "vytalwatch-${var.environment}-s3-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "4xxErrors"
  namespace           = "AWS/S3"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"

  dimensions = {
    BucketName = aws_s3_bucket.uploads.id
  }

  alarm_description = "S3 bucket experiencing high 4xx errors"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}
