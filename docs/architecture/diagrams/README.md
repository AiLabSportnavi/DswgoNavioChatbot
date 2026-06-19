# Diagram sources

Editable source for the larger diagrams used across this blueprint. Keeping them here
(rather than only inline) means they can be regenerated and reviewed independently of
prose. All diagrams use **Mermaid**, which renders directly on GitHub and in most
Markdown previewers.

| File                          | Used by                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `system-overview.mmd`         | [01 Product Architecture](../01-product-architecture.md) §2  |
| `chat-sequence.mmd`           | [02 Backend Architecture](../02-backend-architecture.md) §2  |
| `deploy-cloudrun.mmd`         | [04 Infrastructure](../04-infrastructure-deployment.md) §2   |
| `deploy-vps.mmd`              | [04 Infrastructure](../04-infrastructure-deployment.md) §3   |
| `repo-strategies.md`          | [05 Hosting Organization](../05-hosting-organization.md)     |

To edit: change the `.mmd` source, preview it (GitHub, VS Code Mermaid extension, or
the Mermaid Live Editor), and keep the inline copy in the referencing document in sync.
