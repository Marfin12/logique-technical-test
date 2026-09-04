# AGENTS.md file

## Prompt rules

- The requested prompt should be consistent with the plan.md file and the design.md file. If it is not consistent, please do not execute and warn the user and explain the inconsistency.
- Do not make any changes on these files: plan.md, design.md, rules.md, AGENTS.md. These files are used to generate the prompt and should not be modified.
- Always ask the user for confirmation whenever the execution need to update the package.json file and need to install new dependencies. Do not execute any command that modifies the package.json file or installs new dependencies without the user's confirmation. If the user confirms, then update the package.json file accordingly and install the new dependencies.

## Execution instructions

- Always read the plan.md file and the design.md to understand the user prompt does not contain any inconsistencies with the plan and design.
- If it possible, make the code style consistent with the existing code style in the project unless the user explicitly requests otherwise. If the user requests a different code style, then ask the user for confirmation and explain the incosistency before executing the request.
