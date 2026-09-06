#!/usr/bin/env node
import { HOST_KIT_COPY_RULES } from "../lib/host-kit-manifest.mjs";

process.stdout.write(`${JSON.stringify(HOST_KIT_COPY_RULES)}\n`);

