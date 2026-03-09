#!/usr/bin/env bun
/**
 * Build script untuk compile timetabling example ke binary standalone
 * 
 * Usage:
 *   bun run build:binary          # Build untuk current platform
 *   bun run build:binary:all      # Build untuk semua platform
 *   bun scripts/build-binary.ts --target=bun-linux-x64 --outfile=timetable-solver
 */

import { $ } from "bun";
import path from "path";
import fs from "fs";

const TARGETS = {
  linux: "bun-linux-x64",
  macos: "bun-darwin-x64", 
  macosArm: "bun-darwin-arm64",
  windows: "bun-windows-x64",
} as const;

interface BuildOptions {
  target?: string;
  outfile?: string;
  minify?: boolean;
  bytecode?: boolean;
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const options: BuildOptions = {
    minify: true,
    bytecode: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--target=")) {
      options.target = arg.split("=")[1];
    } else if (arg.startsWith("--outfile=")) {
      options.outfile = arg.split("=")[1];
    } else if (arg === "--no-minify") {
      options.minify = false;
    } else if (arg === "--no-bytecode") {
      options.bytecode = false;
    }
  }

  return options;
}

async function buildBinary(options: BuildOptions) {
  const entrypoint = "./examples/timetabling/example-basic.ts";
  const defaultOutfile = options.target 
    ? `examples/timetabling/timetable-solver-${options.target.replace("bun-", "")}`
    : "examples/timetabling/timetable-solver";
  
  const outfile = options.outfile || defaultOutfile;
  
  console.log("🔨 Building timetable solver binary...");
  console.log(`   Entrypoint: ${entrypoint}`);
  console.log(`   Target: ${options.target || "current platform"}`);
  console.log(`   Output: ${outfile}`);
  console.log(`   Minify: ${options.minify}`);
  console.log(`   Bytecode: ${options.bytecode}`);
  console.log("");

  // Build args
  const args = [
    "build",
    entrypoint,
    "--compile",
    "--outfile", outfile,
  ];

  if (options.target) {
    args.push("--target", options.target);
  }

  if (options.minify) {
    args.push("--minify");
  }

  if (options.bytecode) {
    args.push("--bytecode");
  }

  try {
    const result = await $`bun ${args}`;
    
    if (result.exitCode === 0) {
      console.log(`\n✅ Build successful!`);
      console.log(`   Binary: ./${outfile}`);
      
      // Get file size
      const stats = fs.statSync(outfile);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   Size: ${sizeMB} MB`);
      
      console.log(`\n📋 Usage:`);
      console.log(`   cd examples/timetabling`);
      console.log(`   ./${path.basename(outfile)}`);
      
      if (options.target?.includes("windows")) {
        console.log(`\n   Note: File .exe akan otomatis ditambahkan untuk Windows`);
      }
      
      return true;
    } else {
      console.error(`\n❌ Build failed with exit code: ${result.exitCode}`);
      return false;
    }
  } catch (error) {
    console.error(`\n❌ Build failed:`, error);
    return false;
  }
}

async function buildAll() {
  console.log("🔨 Building for all platforms...\n");
  
  const results: Record<string, boolean> = {};
  
  for (const [name, target] of Object.entries(TARGETS)) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Building for ${name} (${target})...`);
    console.log("=".repeat(60));
    
    results[name] = await buildBinary({
      target,
      minify: true,
      bytecode: true,
    });
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log("Build Summary:");
  console.log("=".repeat(60));
  
  for (const [name, success] of Object.entries(results)) {
    const status = success ? "✅" : "❌";
    console.log(`   ${status} ${name}`);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--all") || args.includes("-a")) {
    await buildAll();
  } else {
    const options = parseArgs();
    await buildBinary(options);
  }
}

main().catch(console.error);
