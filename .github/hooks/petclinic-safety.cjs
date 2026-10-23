const fs = require('node:fs');

function readEvent() {
  const input = fs.readFileSync(0, 'utf8');
  return JSON.parse(input);
}

function writeResult(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function getCommand(event) {
  const args = event.toolArgs;
  return args && typeof args === 'object' && typeof args.command === 'string'
    ? args.command
    : '';
}

function deny(reason) {
  writeResult({
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
  });
}

function requireConfirmation(reason) {
  writeResult({
    permissionDecision: 'ask',
    permissionDecisionReason: reason,
  });
}

function validateCommand(command, toolName) {
  if (/\b(terraform|terragrunt)\s+destroy\b/.test(command)) {
    return 'Blocked: infrastructure destroy commands are not allowed through the agent. Review a destroy plan and perform any intentional destroy manually with explicit human oversight.';
  }

  if (/\b(terraform|terragrunt)\s+apply\s+.*-destroy\b/.test(command)) {
    return 'Blocked: terraform/terragrunt apply -destroy is equivalent to destroying infrastructure.';
  }

  if (/\bkubectl\s+delete\s+(namespace|ns)\s+petclinic-prod\b/.test(command)) {
    return 'Blocked: deleting the production namespace could destroy all resources in petclinic-prod.';
  }

  if (
    /\bkubectl\s+delete\s+(deployment|deploy|service|svc|ingress|ing|secret|configmap|cm|pvc|persistentvolumeclaim|daemonset|ds|statefulset|sts)\b/.test(command) &&
    /(?:-n|--namespace)[= ]?petclinic-prod\b/.test(command)
  ) {
    return 'Blocked: deleting resources in the production namespace is not allowed through the agent.';
  }

  if (
    /\b(?:ExecuteTerraformCommand|ExecuteTerragruntCommand)\b/.test(toolName) &&
    command.trim() === 'destroy'
  ) {
    return 'Blocked: destroy through an MCP Terraform/Terragrunt command is not allowed.';
  }

  const usesRecursiveForce =
    /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+|--recursive\b|--force\b)/.test(command);
  const protectedDirectories = [
    'terraform',
    'k8s',
    'helm',
    'helm-values',
    '.github',
    'docs',
    'scripts',
    '.claude',
  ];

  if (
    usesRecursiveForce &&
    protectedDirectories.some((directory) =>
      new RegExp(
        `(?:^|[\\s/])\\.?/?${directory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/|\\s|$)`,
      ).test(command),
    )
  ) {
    return 'Blocked: recursive forced deletion of a protected infrastructure or project directory is not allowed.';
  }

  if (/\bgit\s+(add|commit)\b/.test(command)) {
    if (/\bgit\s+add\s+(-A|--all|\.)/.test(command)) {
      return 'Blocked: bulk git add can stage secret files. Add reviewed files explicitly or use interactive staging.';
    }

    const secretFilePatterns = [
      /\.env($|\s|\/)/i,
      /\.tfvars($|\s)/i,
      /\.pem($|\s)/i,
      /\.key($|\s)/i,
      /\.p12($|\s)/i,
      /\.pfx($|\s)/i,
      /kubeconfig/i,
      /aws-credentials/i,
      /credentials\.json/i,
      /credentials\.yaml/i,
    ];

    if (secretFilePatterns.some((pattern) => pattern.test(command))) {
      return 'Blocked: the git command appears to stage or commit a file that may contain credentials or secrets.';
    }
  }

  if (/\b(terraform|terragrunt)\s+apply\b/.test(command)) {
    if (/\bapply\s+.*\.(out|tfplan)\b/.test(command)) {
      return '';
    }

    return 'Terraform apply without a saved plan requires explicit confirmation. Recommended workflow: terraform plan -out plan.out, review it, then terraform apply plan.out.';
  }

  return '';
}

function getFilePath(event) {
  const args = event.toolArgs;
  if (!args || typeof args !== 'object') {
    return '';
  }

  for (const key of ['filePath', 'file_path', 'path']) {
    if (typeof args[key] === 'string') {
      return args[key];
    }
  }

  return '';
}

function validationContext(filePath) {
  const safePath = filePath.replace(/[\r\n\t`'$]/g, '_');

  if (/\.tf$/.test(filePath)) {
    const directory = safePath.replace(/\/[^/]*$/, '') || '.';
    return `You edited a Terraform file. Run 'terraform validate' in ${directory}/ and 'terraform fmt -check' to verify formatting.`;
  }

  if (/k8s\/.*\.(yaml|yml)$/.test(filePath)) {
    return `You edited a Kubernetes manifest. Validate with 'kubectl apply --dry-run=client -f ${safePath}'.`;
  }

  if (/(helm\/|helm-values\/).*\.(yaml|yml|tpl)$/.test(filePath)) {
    return 'You edited a Helm file. Validate with helm template and helm lint for the affected service and environment.';
  }

  if (/\.github\/workflows\/.*\.(yaml|yml)$/.test(filePath)) {
    return 'You edited a GitHub Actions workflow. Review it with the pipeline-reviewer agent and validate locally with act --dryrun if available.';
  }

  return '';
}

const phase = process.argv[2];
if (phase !== 'pre' && phase !== 'post') {
  process.stderr.write('Expected hook phase "pre" or "post".\n');
  process.exitCode = 2;
} else {
  let event;
  try {
    event = readEvent();
  } catch (error) {
    process.stderr.write(`Could not parse Copilot hook event JSON: ${error.message}\n`);
    if (phase === 'pre') {
      deny('The safety hook could not read its event input; deny the tool call and review the hook configuration.');
    } else {
      process.exitCode = 1;
    }
  }

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    process.stderr.write('Copilot hook event must be a JSON object.\n');
    if (phase === 'pre') {
      deny('The safety hook received an invalid event; deny the tool call and review the hook configuration.');
    } else {
      process.exitCode = 1;
    }
  } else {
    if (phase === 'pre') {
      const command = getCommand(event);
      if (!command) {
        const toolName = typeof event.toolName === 'string' ? event.toolName : '';
        if (/(bash|terminal|command|shell|exec)/i.test(toolName)) {
          deny('The safety hook could not inspect this command tool input; review the tool arguments before proceeding.');
        } else {
          writeResult({});
        }
      } else {
        const toolName = typeof event.toolName === 'string' ? event.toolName : '';
        const reason = validateCommand(command, toolName);
        if (!reason) {
          writeResult({});
        } else if (/requires explicit confirmation/.test(reason)) {
          requireConfirmation(reason);
        } else {
          deny(reason);
        }
      }
    } else {
      const context = validationContext(getFilePath(event));
      writeResult(context ? { additionalContext: context } : {});
    }
  }
}
