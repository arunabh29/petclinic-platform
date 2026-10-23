# Petclinic Platform — Project Instructions

This repository contains infrastructure code for deploying Spring Petclinic Microservices to AWS. The application repository (`spring-petclinic-microservices`) is read-only: never modify it.

## Architecture and Repository Layout

- `terraform/environments/{dev,prod}/` — environment root modules.
- `terraform/modules/{vpc,eks,ecr,rds,dns,secrets,observability,karpenter}/` — reusable infrastructure modules.
- `helm/petclinic-service/` — one generic chart shared by all eight services.
- `helm-values/` — per-service and per-environment values.
- `k8s/base/` and `k8s/argocd/` — shared Kubernetes resources and ArgoCD applications.
- `.github/workflows/` — CI builds and pushes images; ArgoCD performs deployment.
- `scripts/` — operational scripts.
- `docs/` — architecture, operational guidance, and ADRs.

Read [docs/technical-spec.md](../docs/technical-spec.md) before changing infrastructure values, ports, security groups, Kubernetes resources, probe timings, or alert thresholds. Work items and dependencies are tracked in [docs/jira-backlog.md](../docs/jira-backlog.md).

Detailed file-specific conventions are in:

- [Terraform instructions](./instructions/terraform.instructions.md)
- [Kubernetes instructions](./instructions/kubernetes.instructions.md)
- [Helm instructions](./instructions/helm.instructions.md)
- [Pipeline instructions](./instructions/pipelines.instructions.md)
- [Documentation instructions](./instructions/docs.instructions.md)

## AWS and Terraform

- Use AWS provider `~> 5.0` in `eu-central-1`.
- Use S3 state with DynamoDB locking and state keys `petclinic/{env}/terraform.tfstate`.
- Name resources `petclinic-{env}-{resource}`.
- Tag every taggable resource with `Project=petclinic`, `Environment={dev|prod}`, and `ManagedBy=terraform`.
- ECR repositories are in `eu-central-1`, with lifecycle policies, scan-on-push, and configurable tag immutability.
- Never hardcode secrets. Mark secret outputs `sensitive = true`.
- Run `terraform fmt -recursive`, `terraform validate`, and `terraform plan -out plan.out` as appropriate. Apply only a reviewed saved plan; never run `terraform destroy` or an equivalent destroy operation through the agent.
- Do not commit `*.tfvars` or `.env` files.

## Environments

| Setting | Dev | Prod |
|---|---|---|
| Region | `eu-central-1` | `eu-central-1` |
| Kubernetes namespace | `petclinic-dev` | `petclinic-prod` |
| Terraform state key | `petclinic/dev/terraform.tfstate` | `petclinic/prod/terraform.tfstate` |
| RDS | `db.t4g.micro`, single-AZ | `db.t4g.micro`, single-AZ |
| EKS nodes | 2 × `t4g.small` ARM | 2 × `t4g.small` ARM |
| ArgoCD sync | Automatic, prune and self-heal | Manual |
| Replicas | 1 per service | 2 or more per service, with HPA |

The public-subnet design is intentional for learning and cost optimization; security groups remain the access-control perimeter and must be restrictive.

## Services and Images

| Service | Port | MySQL |
|---|---:|---|
| `config-server` | 8888 | No |
| `discovery-server` | 8761 | No |
| `api-gateway` | 8080 | No |
| `customers-service` | 8081 | Yes |
| `visits-service` | 8082 | Yes |
| `vets-service` | 8083 | Yes |
| `genai-service` | 8084 | Optional; uses `OPENAI_API_KEY` |
| `admin-server` | 9090 | No |

Images use `eclipse-temurin:17`, target `linux/arm64`, and `SPRING_PROFILES_ACTIVE=docker`; MySQL-backed services also use the `mysql` profile. ECR repository names follow `{account}.dkr.ecr.eu-central-1.amazonaws.com/petclinic-{env}/{service-name}`. CI builds on x86 runners require Docker Buildx and QEMU for ARM cross-compilation.

Config Server starts first, Discovery Server second, then the remaining services. Secrets flow through AWS Secrets Manager and External Secrets Operator; never store secret values in code or YAML.

## CI/CD and ArgoCD

- GitHub Actions performs CI only: build, scan, push, and commit image-tag updates. It must not run `kubectl apply` or `helm upgrade`.
- Authenticate to AWS using GitHub Actions OIDC, never long-lived credentials.
- Tag images with the commit SHA, never `latest`; Trivy must fail on CRITICAL findings.
- ArgoCD deploys from Git. Dev auto-syncs; prod requires manual sync.
- ECR login uses `aws ecr get-login-password --region eu-central-1`.

## MCP Configuration

Project MCP server definitions are in [`.mcp.json`](../.mcp.json). They provide Terraform/AWS documentation and scanning, AWS documentation and pricing, Context7, and Atlassian/Jira integration. Do not copy machine-local AWS profile settings into shared project instructions.

## Common Validation Commands

```bash
terraform fmt -recursive
terraform validate
terraform plan -out plan.out
terraform apply plan.out
helm template my-release helm/petclinic-service/ \
  -f helm-values/{service}.yaml \
  -f helm-values/{env}.yaml
checkov -d terraform/modules/{module}
```

For exact workflow and security requirements, follow the linked file-specific instructions and the technical specification. Do not deploy infrastructure or modify AWS resources unless the user explicitly requests it and the required review/confirmation steps have been completed.
