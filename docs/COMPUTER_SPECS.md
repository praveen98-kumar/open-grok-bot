# Bot Computer Specs

The Linux computer that a Grok Bot reported it runs on. All Bots share this one
machine. Use it as a reference when sizing our `computer` container.

## Summary

A modest cloud Linux box. Good for dev work. Short on memory.

| Part | Spec |
|---|---|
| OS | Debian 13 (trixie), Linux kernel 6.12, `x86_64` |
| CPU | Intel Xeon, 8 cores (1 thread per core, 8 threads total), AVX2 and AVX-512 |
| RAM | 15 GB, no swap. About 13 GB used, about 2 GB free. |
| Disk | 128 GB. 8 GB used, 120 GB free. |
| GPU | None |
| Virtualization | Container on a virtual disk (`/dev/vdb`) |
| Uptime | About 15 h 42 m when checked |

## Notes

- **RAM is the limit.** Only about 2 GB is free and there is no swap. A heavy job,
  such as a big build or a local model, could be killed for running out of memory.
- **Memory is shared.** All Bots use the same computer, so most of the RAM is
  already in use.
- **CPU and disk are fine.** Both have plenty of room.

## What this means for us

- Give the `computer` container enough RAM for Chromium plus several Bots.
- Consider adding swap, or set memory limits so one job can't take down the rest.
- No GPU is needed. LLM inference runs remotely.
