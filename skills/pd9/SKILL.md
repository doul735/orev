---
name: pd9
description: PD 9, reserved community/organization variant slot. Not used by the default release workflow.
user-invocable: true
allowed-tools: Read, Glob, Grep
argument-hint: "[reserved]"
---

# /pd9: Reserved Slot

PD 9 is intentionally empty. Like PD 2/4/6/8, it is reserved for community or organization-specific workflow variants.

## Default Policy

- Do not use PD 9 as a default release workflow.
- Use `/pd7` for authentication, authorization, payment, billing, data, security, infrastructure, Cancer-zero, and release-proof work.
- This file is a placeholder until a project defines an explicit custom policy.

## Runtime Response

```text
PD 9 is a reserved slot.
The highest default verification tier is /pd7.
Use /pd7 for auth/payment/data/security or Cancer-zero releases.
```
