terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }

  backend "s3" {
    bucket         = "vytalwatch-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "vytalwatch-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "VytalWatch"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "RPM"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# EKS Cluster
resource "aws_eks_cluster" "vytalwatch" {
  name     = "vytalwatch-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.27"

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_cloudwatch_log_group.eks
  ]

  tags = {
    Name = "vytalwatch-${var.environment}"
  }
}

# EKS Node Group
resource "aws_eks_node_group" "vytalwatch" {
  cluster_name    = aws_eks_cluster.vytalwatch.name
  node_group_name = "vytalwatch-${var.environment}-nodes"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = var.node_desired_size
    max_size     = var.node_max_size
    min_size     = var.node_min_size
  }

  instance_types = var.node_instance_types

  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = {
    Name = "vytalwatch-${var.environment}-nodes"
  }
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/vytalwatch-${var.environment}/cluster"
  retention_in_days = 30

  tags = {
    Name = "vytalwatch-${var.environment}-eks-logs"
  }
}

# IAM Roles
resource "aws_iam_role" "eks_cluster" {
  name = "vytalwatch-${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role" "eks_node_group" {
  name = "vytalwatch-${var.environment}-eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group.name
}

# Security Group for EKS Cluster
resource "aws_security_group" "eks_cluster" {
  name        = "vytalwatch-${var.environment}-eks-cluster-sg"
  description = "Security group for VytalWatch EKS cluster"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "vytalwatch-${var.environment}-eks-cluster-sg"
  }
}

# KMS Key for encryption
resource "aws_kms_key" "vytalwatch" {
  description             = "VytalWatch encryption key for ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "vytalwatch-${var.environment}-kms-key"
  }
}

resource "aws_kms_alias" "vytalwatch" {
  name          = "alias/vytalwatch-${var.environment}"
  target_key_id = aws_kms_key.vytalwatch.key_id
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
}

variable "node_desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 4
}

variable "node_max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "node_min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 2
}

variable "node_instance_types" {
  description = "Instance types for nodes"
  type        = list(string)
  default     = ["t3.large"]
}
