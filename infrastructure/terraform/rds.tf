# RDS PostgreSQL Database
resource "aws_db_instance" "vytalwatch" {
  identifier     = "vytalwatch-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.vytalwatch.arn

  db_name  = "vytalwatch"
  username = "vytalwatch"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.vytalwatch.name

  multi_az               = var.environment == "production" ? true : false
  publicly_accessible    = false
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  deletion_protection = var.environment == "production" ? true : false
  skip_final_snapshot = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "vytalwatch-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  tags = {
    Name        = "vytalwatch-${var.environment}"
    Backup      = "Required"
    Compliance  = "HIPAA"
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "vytalwatch" {
  name       = "vytalwatch-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "vytalwatch-${var.environment}-db-subnet-group"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "vytalwatch-${var.environment}-rds-sg"
  description = "Security group for VytalWatch RDS database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
    description     = "PostgreSQL from EKS cluster"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "vytalwatch-${var.environment}-rds-sg"
  }
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "vytalwatch-${var.environment}-db-password"
  description             = "VytalWatch database password"
  recovery_window_in_days = 30
  kms_key_id              = aws_kms_key.vytalwatch.arn

  tags = {
    Name = "vytalwatch-${var.environment}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = aws_db_instance.vytalwatch.username
    password = random_password.db_password.result
    host     = aws_db_instance.vytalwatch.endpoint
    port     = aws_db_instance.vytalwatch.port
    dbname   = aws_db_instance.vytalwatch.db_name
  })
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "vytalwatch-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.vytalwatch.id
  }

  alarm_description = "This metric monitors RDS CPU utilization"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "vytalwatch-${var.environment}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240" # 10 GB

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.vytalwatch.id
  }

  alarm_description = "This metric monitors RDS free storage space"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name              = "vytalwatch-${var.environment}-alerts"
  kms_master_key_id = aws_kms_key.vytalwatch.arn

  tags = {
    Name = "vytalwatch-${var.environment}-alerts"
  }
}

# Variables
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling"
  type        = number
  default     = 500
}
