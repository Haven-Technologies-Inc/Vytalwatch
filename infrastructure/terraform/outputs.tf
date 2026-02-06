output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.vytalwatch.endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.vytalwatch.name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.vytalwatch.endpoint
  sensitive   = true
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.vytalwatch.db_name
}

output "s3_backups_bucket" {
  description = "S3 backups bucket name"
  value       = aws_s3_bucket.backups.id
}

output "s3_uploads_bucket" {
  description = "S3 uploads bucket name"
  value       = aws_s3_bucket.uploads.id
}

output "kms_key_id" {
  description = "KMS key ID for encryption"
  value       = aws_kms_key.vytalwatch.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = aws_kms_key.vytalwatch.arn
}

output "db_secret_arn" {
  description = "Database credentials secret ARN"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}
