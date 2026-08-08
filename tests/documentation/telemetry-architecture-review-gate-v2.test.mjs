import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const repositoryRoot = new URL("../../", import.meta.url);
const reviewPath = new URL(
  "../../docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V2.md",
  import.meta.url,
);
const reviewedHead = "40c23312a777e9cf48562bb8750042e9d922cb82";
const reviewedParent = "574ae63ab8a1aa777296749be6c454e381aeadb1";
const reviewedBase = "48f12fd1c2f3fc1578e3fd9dbe7d051490251476";

const ready = Object.freeze([
  "TelemetryBucketId",
  "AudienceProjectionId",
  "TelemetryEventId",
  "TelemetryCapabilityStatus",
  "TelemetrySchemaVersion",
  "CollectorVersion",
  "CapabilityVersion",
  "CollectionPolicyVersion",
  "AudienceProjectionVersion",
  "AudienceProjectionPolicyVersion",
]);

const partial = Object.freeze([
  "TelemetryBucket",
  "TelemetryBucketAccepted",
  "TelemetryBucketRejected",
  "AudienceProjection",
  "TelemetryCaptured",
  "TelemetryBucketClosed",
  "EdgeTelemetryCapabilityChanged",
  "EdgeTelemetryIncidentReported",
  "TelemetryValidationIncidentReported",
  "TelemetryCapabilityChanged",
  "TelemetryIncidentReported",
  "CapabilityDeclared",
  "CapabilityValidated",
  "CapabilityRejected",
  "CapabilityActivated",
  "CapabilityDegraded",
  "CapabilitySuspended",
  "CapabilityRecovered",
  "CapabilityRetired",
  "AudienceProjectionApplier",
  "AudienceProjectionProduced",
  "AudienceProjectionExpired",
  "AudienceProjectionInvalidated",
]);

const materialized = Object.freeze([
  "TelemetryBucketId",
  "AudienceProjectionId",
  "TelemetryEventId",
  "TelemetryCapabilityStatus",
]);

const authorizedNotMaterialized = Object.freeze([
  "TelemetrySchemaVersion",
  "CollectorVersion",
  "CapabilityVersion",
  "CollectionPolicyVersion",
  "AudienceProjectionVersion",
  "AudienceProjectionPolicyVersion",
]);

const gitShow = (path) =>
  execFileSync("git", ["show", `${reviewedHead}:${path}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

const gitTree = (path) =>
  execFileSync("git", ["ls-tree", "-r", "--name-only", reviewedHead, "--", path], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

const section = (document, heading) => {
  const marker = `## ${heading}`;
  const start = document.indexOf(marker);
  assert.notEqual(start, -1, `missing section: ${heading}`);
  const end = document.indexOf("\n## ", start + marker.length);
  return document.slice(start, end === -1 ? document.length : end);
};

const lineContaining = (document, needle) => {
  const line = document.split(/\r?\n/).find((candidate) => candidate.includes(needle));
  assert.ok(line, `missing reviewed line containing: ${needle}`);
  return line;
};

const manifest = (gate, name) =>
  JSON.parse(gate.match(new RegExp(`^${name}: (\\[[^\\n]+\\])$`, "m"))?.[1] ?? "null");

const exportedStringArray = (source, name) => {
  const body = source.match(
    new RegExp(`export const ${name} = Object\\.freeze\\(\\[([\\s\\S]*?)\\] as const\\);`),
  )?.[1];
  assert.ok(body, `missing reviewed export array: ${name}`);
  return [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
};

const stringProperty = (object, name) => {
  const property = object.properties.find(
    (candidate) => ts.isPropertyAssignment(candidate) && candidate.name.getText() === name,
  );
  assert.ok(property && ts.isStringLiteral(property.initializer), `missing string property: ${name}`);
  return property.initializer.text;
};

const unwrapFrozenObject = (expression) => {
  assert.ok(ts.isCallExpression(expression), "registry value must be Object.freeze(object)");
  assert.ok(
    ts.isPropertyAccessExpression(expression.expression) &&
      expression.expression.expression.getText() === "Object" &&
      expression.expression.name.text === "freeze",
    "registry value must use Object.freeze",
  );
  assert.equal(expression.arguments.length, 1);
  assert.ok(ts.isObjectLiteralExpression(expression.arguments[0]));
  return expression.arguments[0];
};

const interpretTelemetryRegistry = (source) => {
  const sourceFile = ts.createSourceFile("artifact-authorization.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const arrays = new Map([
    ["telemetryAuthorizedArtifacts", exportedStringArray(source, "telemetryAuthorizedArtifacts")],
    ["telemetryPartialArtifacts", exportedStringArray(source, "telemetryPartialArtifacts")],
  ]);
  const registrations = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isForOfStatement(statement) || !ts.isIdentifier(statement.expression)) continue;
    const array = statement.expression.text;
    if (!arrays.has(array)) continue;
    assert.ok(ts.isVariableDeclarationList(statement.initializer));
    assert.equal(statement.initializer.declarations.length, 1);
    assert.equal(statement.initializer.declarations[0].name.getText(sourceFile), "artifact");
    assert.ok(ts.isBlock(statement.statement), `${array} loop must use a block`);
    assert.equal(statement.statement.statements.length, 1, `${array} loop must contain exactly one statement`);
    const onlyStatement = statement.statement.statements[0];
    assert.ok(ts.isExpressionStatement(onlyStatement));
    assert.ok(ts.isCallExpression(onlyStatement.expression));
    const call = onlyStatement.expression;
    assert.ok(
      ts.isPropertyAccessExpression(call.expression) &&
        call.expression.expression.getText(sourceFile) === "registry" &&
        call.expression.name.text === "set",
      `${array} loop must contain exactly one registry.set`,
    );
    assert.equal(call.arguments.length, 2);
    assert.equal(call.arguments[0].getText(sourceFile), "artifact");
    const object = unwrapFrozenObject(call.arguments[1]);
    registrations.push({
      array,
      call,
      status: stringProperty(object, "status"),
      provenance: stringProperty(object, "source"),
    });
  }
  assert.deepEqual(
    registrations.map(({ array }) => array),
    ["telemetryAuthorizedArtifacts", "telemetryPartialArtifacts"],
  );

  const results = new Map();
  for (const registration of registrations) {
    for (const artifact of arrays.get(registration.array)) {
      assert.ok(!results.has(artifact), `duplicate telemetry registration: ${artifact}`);
      results.set(artifact, {
        status: registration.status,
        source: registration.provenance,
      });
    }
  }

  const telemetryNames = new Set(results.keys());
  const certifiedCalls = new Set(registrations.map(({ call }) => call));
  const inspectRegistryReference = (node) => {
    if (ts.isIdentifier(node) && node.text === "registry") {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && parent.name === node) {
        assert.ok(
          parent.initializer &&
            ts.isNewExpression(parent.initializer) &&
            parent.initializer.expression.getText(sourceFile) === "Map",
          "registry may be declared exactly once as the authoritative Map",
        );
        return;
      }
      const directMethod =
        ts.isPropertyAccessExpression(parent) && parent.expression === node;
      const indexedMethod =
        ts.isElementAccessExpression(parent) && parent.expression === node;
      assert.ok(directMethod || indexedMethod, "registry escapes through alias, argument, return, closure or spread");
      assert.ok(!indexedMethod, "indexed registry access can alias or mutate the registry");
      if (directMethod) {
        assert.ok(
          ["get", "values", "set", "delete", "clear"].includes(parent.name.text),
          `unrecognized registry access: ${parent.name.text}`,
        );
        assert.ok(
          ts.isCallExpression(parent.parent) && parent.parent.expression === parent,
          `registry.${parent.name.text} escapes as a method alias`,
        );
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const direct =
        ts.isPropertyAccessExpression(callee) && callee.expression.getText(sourceFile) === "registry";
      const indexed =
        ts.isElementAccessExpression(callee) && callee.expression.getText(sourceFile) === "registry";
      if (indexed) assert.fail("indexed registry call can alias or mutate the registry");
      if (direct) {
        const method = callee.name.text;
        if (method === "set") {
          if (certifiedCalls.has(node)) {
            // The exact call shape was already certified while parsing the two loops.
          } else {
            assert.ok(ts.isStringLiteral(node.arguments[0]), "dynamic registry write outside certified loops");
            assert.ok(
              !telemetryNames.has(node.arguments[0].text),
              `non-certified Telemetry registry write: ${node.arguments[0].text}`,
            );
          }
        } else if (["delete", "clear"].includes(method)) {
          assert.fail(`registry.${method} is prohibited outside certified loops`);
        } else {
          assert.ok(["get", "values"].includes(method), `unrecognized registry call: ${method}`);
        }
      }
    }
    ts.forEachChild(node, inspectRegistryReference);
  };
  inspectRegistryReference(sourceFile);

  const fallback = source.match(
    /registry\.get\(artifact\) \?\?[\s\S]*?status: "([^"]+)"[\s\S]*?source: "([^"]+)"/,
  );
  assert.ok(fallback, "missing authorizationFor deny-by-default fallback");
  return {
    arrays,
    registrations,
    results,
    authorizationFor: (artifact) =>
      results.get(artifact) ?? { status: fallback[1], source: fallback[2] },
  };
};

const moduleExports = (path, sources, cache = new Map()) => {
  if (cache.has(path)) return cache.get(path);
  const source = sources[path];
  assert.ok(source, `unresolved module: ${path}`);
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exports = new Map();
  cache.set(path, exports);
  const consumed = new Set();
  const hasModifier = (node, kind) => node.modifiers?.some((modifier) => modifier.kind === kind);
  const add = (name, kind) => {
    assert.ok(!exports.has(name), `duplicate public export ${name} in ${path}`);
    exports.set(name, kind);
  };
  const targetPath = (specifier) => {
    assert.ok(specifier.startsWith("./"), `external re-export is prohibited: ${specifier}`);
    return `${path.slice(0, path.lastIndexOf("/") + 1)}${specifier.slice(2)}`;
  };

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) assert.fail(`export assignment is prohibited in ${path}`);
    if (ts.isExportDeclaration(statement)) {
      consumed.add(statement.pos);
      const target = statement.moduleSpecifier
        ? moduleExports(targetPath(statement.moduleSpecifier.text), sources, cache)
        : undefined;
      if (!statement.exportClause) {
        assert.ok(target, `unresolved export star in ${path}`);
        for (const [name, kind] of target) add(name, kind);
      } else if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          const sourceName = element.propertyName?.text ?? element.name.text;
          const kind = target?.get(sourceName);
          assert.ok(kind || !target, `unresolved named re-export ${sourceName} in ${path}`);
          add(element.name.text, kind ?? "named");
        }
      } else {
        assert.fail(`namespace re-export is prohibited in ${path}`);
      }
      continue;
    }
    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
    consumed.add(statement.pos);
    assert.ok(!hasModifier(statement, ts.SyntaxKind.DefaultKeyword), `default export is prohibited in ${path}`);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        assert.ok(ts.isIdentifier(declaration.name), `destructured export is prohibited in ${path}`);
        add(declaration.name.text, "const");
      }
    } else if (
      ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
      ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)
    ) {
      assert.ok(statement.name && ts.isIdentifier(statement.name), `anonymous export is prohibited in ${path}`);
      const kind = ts.isTypeAliasDeclaration(statement) ? "type" :
        ts.isInterfaceDeclaration(statement) ? "interface" :
          ts.isClassDeclaration(statement) ? "class" :
            ts.isFunctionDeclaration(statement) ? "function" :
              ts.isEnumDeclaration(statement) ? "enum" : "namespace";
      add(statement.name.text, kind);
    } else {
      assert.fail(`unconsumed export statement in ${path}: ${statement.getText(sourceFile)}`);
    }
  }

  const findUnconsumed = (node) => {
    if (
      (ts.isExportDeclaration(node) || ts.isExportAssignment(node) || hasModifier(node, ts.SyntaxKind.ExportKeyword)) &&
      !consumed.has(node.pos)
    ) {
      assert.fail(`unconsumed export syntax in ${path}: ${node.getText(sourceFile)}`);
    }
    ts.forEachChild(node, findUnconsumed);
  };
  findUnconsumed(sourceFile);
  return exports;
};

const bindingNames = (name) => {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingNames(element.name),
  );
};

const modifierNames = (node) =>
  (node.modifiers ?? []).map((modifier) => ts.tokenToString(modifier.kind) ?? ts.SyntaxKind[modifier.kind]);

const topLevelInventory = (path, source) => {
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return sourceFile.statements.flatMap((statement) => {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      const names = [];
      if (clause?.name) names.push(clause.name.text);
      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) names.push(clause.namedBindings.name.text);
        else names.push(...clause.namedBindings.elements.map((element) => element.name.text));
      }
      return [`import:${statement.moduleSpecifier.text}:${names.join(",")}`];
    }
    if (ts.isImportEqualsDeclaration(statement)) {
      return [`import-equals:${statement.name.text}:${statement.moduleReference.getText(sourceFile)}`];
    }
    if (ts.isVariableStatement(statement)) {
      const declarationKind = statement.declarationList.flags & ts.NodeFlags.Const
        ? "const"
        : statement.declarationList.flags & ts.NodeFlags.Let
          ? "let"
          : "var";
      return statement.declarationList.declarations.flatMap((declaration) =>
        bindingNames(declaration.name).map((name) => `${declarationKind}:${name}:${modifierNames(statement).join(",")}`),
      );
    }
    if (ts.isForOfStatement(statement) || ts.isForInStatement(statement)) {
      assert.ok(ts.isVariableDeclarationList(statement.initializer), `non-declarative top-level loop in ${path}`);
      return statement.initializer.declarations.flatMap((declaration) =>
        bindingNames(declaration.name).map((name) => `${ts.isForOfStatement(statement) ? "for-of" : "for-in"}:${name}`),
      );
    }
    if (
      ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
      ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)
    ) {
      const kind = ts.isTypeAliasDeclaration(statement) ? "type" :
        ts.isInterfaceDeclaration(statement) ? "interface" :
          ts.isClassDeclaration(statement) ? "class" :
            ts.isFunctionDeclaration(statement) ? "function" :
              ts.isEnumDeclaration(statement) ? "enum" : "module";
      const name = statement.name && ts.isIdentifier(statement.name) ? statement.name.text : "<anonymous>";
      return [`${kind}:${name}:${modifierNames(statement).join(",")}`];
    }
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause
        ? statement.exportClause.getText(sourceFile)
        : "*";
      const target = statement.moduleSpecifier?.text ?? "<local>";
      return [`export:${clause}:${target}`];
    }
    if (ts.isExportAssignment(statement)) {
      return [`export-assignment:${statement.isExportEquals ? "equals" : "default"}`];
    }
    if (ts.isExpressionStatement(statement)) {
      return [`expression:${statement.expression.getText(sourceFile)}`];
    }
    assert.fail(`unconsumed top-level statement in ${path}: ${statement.getText(sourceFile)}`);
  });
};

const expectedTopLevelInventory = Object.freeze({
  "packages/telemetry/src/capability.ts": Object.freeze([
    "import:../../generation/src/index.ts:assertGenerationAuthorized",
    'expression:assertGenerationAuthorized("TelemetryCapabilityStatus")',
    "const:TELEMETRY_CAPABILITY_STATUSES:export",
    "type:TelemetryCapabilityStatus:export",
    "function:isTelemetryCapabilityStatus:export",
  ]),
  "packages/telemetry/src/identities.ts": Object.freeze([
    "import:../../generation/src/index.ts:assertGenerationAuthorized",
    "import:../../kernel/src/index.ts:createOpaqueId,OpaqueId",
    "type:TelemetryBucketId:export",
    "type:AudienceProjectionId:export",
    "type:TelemetryEventId:export",
    "for-of:artifact",
    "function:createTelemetryBucketId:export",
    "function:createAudienceProjectionId:export",
    "function:createTelemetryEventId:export",
  ]),
  "packages/telemetry/src/index.ts": Object.freeze([
    "export:*:./capability.ts",
    "export:*:./identities.ts",
  ]),
});

const assertExactTopLevelInventory = (sources) => {
  for (const [path, expected] of Object.entries(expectedTopLevelInventory)) {
    assert.deepEqual(topLevelInventory(path, sources[path]), expected, path);
  }
};

test("records the immutable C3 approval and preserves V1 separately", async () => {
  const review = await readFile(reviewPath, "utf8");
  assert.match(review, /^Status: APPROVED$/m);
  assert.match(review, new RegExp(`^Reviewed head: \`${reviewedHead}\`$`, "m"));
  assert.match(review, new RegExp(`^Reviewed parent: \`${reviewedParent}\`$`, "m"));
  assert.match(review, new RegExp(`^Reviewed range: \`${reviewedBase}\\.\\.${reviewedHead}\`$`, "m"));
  assert.match(review, /TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1\.md.*historical/i);

  execFileSync("git", ["cat-file", "-e", `${reviewedHead}^{commit}`], { cwd: repositoryRoot });
  execFileSync("git", ["cat-file", "-e", `${reviewedBase}^{commit}`], { cwd: repositoryRoot });
  assert.equal(
    execFileSync("git", ["rev-parse", `${reviewedHead}^`], { cwd: repositoryRoot, encoding: "utf8" }).trim(),
    reviewedParent,
  );
  execFileSync("git", ["merge-base", "--is-ancestor", reviewedBase, reviewedHead], {
    cwd: repositoryRoot,
  });
});

test("mechanically preserves the invalidated historical V1 record", () => {
  const historical = gitShow("docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1.md");
  assert.match(historical, /^# Telemetry Architecture Review Gate V1$/m);
  assert.match(historical, /^Status: INVALIDATED_BY_AUTHORIZATION_CHANGE$/m);
  assert.match(historical, /^Required next gate: Task C3 manual Architecture Review Gate$/m);
  assert.match(historical, /^Prior reviewed authorization: READY 4 \/ PARTIAL 29$/m);
  assert.match(historical, /^Current unreviewed authorization: READY 10 \/ PARTIAL 23$/m);
  assert.doesNotMatch(historical, /^Status: APPROVED$/m);
});

test("validates strategic invariants from immutable reviewed sources", () => {
  const telemetry = gitShow("docs/domain/TELEMETRY.md");
  const contexts = gitShow("docs/domain/BOUNDED_CONTEXTS.md");
  const ownership = gitShow("docs/domain/OWNERSHIP.md");
  const compatibility = gitShow("docs/domain/CONTRACT_COMPATIBILITY.md");
  const evidence = gitShow("docs/domain/EVIDENCE_PIPELINE.md");
  const pricing = gitShow("docs/domain/PRICING_ENGINE.md");
  const platform = gitShow("docs/specification/PLATFORM_SPECIFICATION.md");
  const decisions = gitShow("docs/specification/DECISION_REGISTRY.md");

  assert.match(lineContaining(telemetry, "does not introduce an Audience Bounded Context"), /internal Telemetry projection/);
  assert.match(lineContaining(contexts, "Telemetry Ledger append-only"), /AudienceProjection/);
  assert.match(
    lineContaining(ownership, "| AudienceProjection |"),
    /Telemetry Context.*Pricing Engine, AI, Analytics, Marketplace.*Projeção interna/is,
  );

  assert.match(compatibility, /producer.*owns.*identity/is);
  assert.match(compatibility, /consumer.*owns.*CompatibilityMatrix/is);
  assert.match(
    compatibility,
    /Configuration Service distributes, caches, retains and serves immutable revisions only\. It cannot author entries, change effective periods, infer support or select a revision on behalf of a consumer\./,
  );
  assert.match(telemetry, /never evaluates consumer compatibility/i);

  assert.match(lineContaining(evidence, "somente o Evidence Ledger materializa"), /EvidenceRecord/);
  assert.match(lineContaining(pricing, "Only new PricingQuotes may consume"), /remain unchanged/i);
  assert.match(platform, /Evidence Ledger alone materializes EvidenceRecord/i);

  assert.match(decisions, /DEC-065/);
  assert.match(decisions, /OPAQUE_TOKEN_V1/);
  assert.match(compatibility, /\[A-Za-z0-9\]\[A-Za-z0-9\._:\+\-\]\*/);
  assert.match(compatibility, /case-sensitive/i);
  assert.match(compatibility, /lexical grammar.*not.*semantics/is);
  assert.match(compatibility, /INVALID_VERSION_IDENTITY_REPRESENTATION/);
  assert.match(compatibility, /no normalization|shall not normalize/i);

  assert.match(compatibility, /There is no global compatibility matrix/i);
  assert.doesNotMatch(compatibility, /global compatibility matrix (?:is|shall be) (?:owned|authoritative|effective)/i);
  assert.doesNotMatch(contexts, /^\|\s*(?:Audience|Compatibility)(?:\s+[^|]*)?\s*\|/mi);
  assert.doesNotMatch(telemetry, /Telemetry (?:owns|evaluates|decides) (?:a |the )?(?:consumer )?CompatibilityMatrix/i);
  assert.doesNotMatch(ownership, /\|\s*CompatibilityMatrix\s*\|\s*\*\*Telemetry/i);
  assert.doesNotMatch(
    compatibility,
    /Configuration Service (?:authors|owns|decides|infers|selects) (?:consumer )?compatibility/i,
  );
});

test("proves each of the six producer-owned version syntax declarations", () => {
  const telemetry = gitShow("docs/domain/TELEMETRY.md");
  const edgeRuntime = gitShow("docs/tv-network/EDGE_RUNTIME.md");
  const capabilityManagement = gitShow("docs/tv-network/CAPABILITY_MANAGEMENT.md");

  for (const artifact of [
    "TelemetrySchemaVersion",
    "CollectionPolicyVersion",
    "AudienceProjectionVersion",
    "AudienceProjectionPolicyVersion",
  ]) {
    assert.match(
      lineContaining(telemetry, `\`${artifact}\``),
      /VersionSyntax = OPAQUE_TOKEN_V1/,
      `${artifact} must declare its syntax in the immutable Telemetry authority`,
    );
  }
  assert.match(
    lineContaining(edgeRuntime, "`CollectorVersion`"),
    /owner Edge Runtime.*VersionSyntax = OPAQUE_TOKEN_V1/i,
  );
  assert.match(
    lineContaining(capabilityManagement, "`CapabilityVersion`"),
    /TV Network capability owner.*VersionSyntax = OPAQUE_TOKEN_V1/i,
  );
});

test("proves exact READY and PARTIAL authorization from the reviewed snapshot", () => {
  const gate = gitShow("docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md");
  const registry = gitShow("packages/generation/src/artifact-authorization.ts");
  const gateReady = manifest(gate, "READY_MANIFEST");
  const gatePartial = manifest(gate, "PARTIAL_MANIFEST");

  assert.deepEqual(gateReady, ready);
  assert.deepEqual(gatePartial, partial);
  assert.equal(gateReady.length, 10);
  assert.equal(gatePartial.length, 23);
  assert.equal(new Set([...gateReady, ...gatePartial]).size, 33);
  assert.deepEqual(
    [...gate.matchAll(/^\| `([^`]+)` \| `IMPLEMENTATION_READY` \|/gm)].map((match) => match[1]),
    ready,
  );
  assert.deepEqual(
    [...gate.matchAll(/^\| `([^`]+)` \| `IMPLEMENTATION_PARTIAL` \|/gm)].map((match) => match[1]),
    partial,
  );
  assert.deepEqual(exportedStringArray(registry, "telemetryAuthorizedArtifacts"), ready);
  assert.deepEqual(exportedStringArray(registry, "telemetryPartialArtifacts"), partial);
  assert.match(registry, /status: "IMPLEMENTATION_READY"[\s\S]*?source: "TELEMETRY_IMPLEMENTATION_GATE_V1\.md"/);
  assert.match(registry, /status: "IMPLEMENTATION_PARTIAL"[\s\S]*?source: "TELEMETRY_IMPLEMENTATION_GATE_V1\.md"/);

  const interpreted = interpretTelemetryRegistry(registry);
  assert.deepEqual(interpreted.arrays.get("telemetryAuthorizedArtifacts"), gateReady);
  assert.deepEqual(interpreted.arrays.get("telemetryPartialArtifacts"), gatePartial);
  assert.deepEqual(
    interpreted.registrations.map(({ array, status, provenance }) => ({ array, status, provenance })),
    [
      {
        array: "telemetryAuthorizedArtifacts",
        status: "IMPLEMENTATION_READY",
        provenance: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
      },
      {
        array: "telemetryPartialArtifacts",
        status: "IMPLEMENTATION_PARTIAL",
        provenance: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
      },
    ],
  );
  for (const artifact of [...gateReady, ...gatePartial]) {
    const expectedStatus = gateReady.includes(artifact)
      ? "IMPLEMENTATION_READY"
      : "IMPLEMENTATION_PARTIAL";
    assert.deepEqual(interpreted.authorizationFor(artifact), {
      status: expectedStatus,
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    });
  }
  assert.deepEqual(interpreted.authorizationFor("TelemetryUnregisteredArtifact"), {
    status: "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
    source: "CGS-A-1 deny-by-default",
  });

  const mutated = registry.replace(
    'status: "IMPLEMENTATION_PARTIAL",',
    'status: "IMPLEMENTATION_READY",',
  );
  const mutatedInterpretation = interpretTelemetryRegistry(mutated);
  assert.throws(() =>
    assert.deepEqual(
      [...mutatedInterpretation.results.entries()],
      [...interpreted.results.entries()],
    ),
  );
  const duplicateWriteMutation = registry.replace(
    "for (const artifact of telemetryPartialArtifacts) {",
    `for (const artifact of telemetryPartialArtifacts) {
  registry.set(artifact, Object.freeze({ artifact, status: "IMPLEMENTATION_READY", source: "MUTATION" }));`,
  );
  assert.throws(
    () => interpretTelemetryRegistry(duplicateWriteMutation),
    /must contain exactly one statement/,
  );
  const betweenLoopsOverride = registry.replace(
    "for (const artifact of telemetryPartialArtifacts) {",
    `registry.set("TelemetryBucketId", Object.freeze({ artifact: "TelemetryBucketId", status: "IMPLEMENTATION_READY", source: "MUTATION" }));

for (const artifact of telemetryPartialArtifacts) {`,
  );
  assert.throws(
    () => interpretTelemetryRegistry(betweenLoopsOverride),
    /non-certified Telemetry registry write: TelemetryBucketId/,
  );
  const aliasMutation = registry
    .replace(
      "for (const artifact of telemetryAuthorizedArtifacts) {",
      "const registryAlias = registry;\n\nfor (const artifact of telemetryAuthorizedArtifacts) {",
    )
    .replace(
      "registry.set(\n  \"GovernanceCase\"",
      "registryAlias.set(\"TelemetryBucketId\", Object.freeze({ artifact: \"TelemetryBucketId\", status: \"IMPLEMENTATION_READY\", source: \"MUTATION\" }));\n\nregistry.set(\n  \"GovernanceCase\"",
    );
  assert.throws(
    () => interpretTelemetryRegistry(aliasMutation),
    /registry escapes through alias/,
  );
});

test("proves the pre-C4 package contains four materialized artifacts only", () => {
  const packageTree = gitTree("packages/telemetry");
  assert.deepEqual(packageTree, [
    "packages/telemetry/package.json",
    "packages/telemetry/src/capability.ts",
    "packages/telemetry/src/identities.ts",
    "packages/telemetry/src/index.ts",
  ]);
  const sources = Object.fromEntries(packageTree.map((path) => [path, gitShow(path)]));
  const index = sources["packages/telemetry/src/index.ts"];
  const identities = sources["packages/telemetry/src/identities.ts"];
  const capability = sources["packages/telemetry/src/capability.ts"];
  const packageSource = Object.values(sources).join("\n");

  assertExactTopLevelInventory(sources);
  assert.throws(
    () => assertExactTopLevelInventory({
      ...sources,
      "packages/telemetry/src/capability.ts": `${capability}\nclass TelemetryBucket {}\n`,
    }),
    /packages\/telemetry\/src\/capability\.ts/,
  );
  assert.throws(
    () => assertExactTopLevelInventory({
      ...sources,
      "packages/telemetry/src/identities.ts": `${identities}\nconst CompatibilityEvaluator = () => undefined;\n`,
    }),
    /packages\/telemetry\/src\/identities\.ts/,
  );

  const publicDeclarations = [...moduleExports("packages/telemetry/src/index.ts", sources).entries()]
    .sort(([left], [right]) => left.localeCompare(right));
  assert.deepEqual(publicDeclarations, [
    ["AudienceProjectionId", "type"],
    ["TELEMETRY_CAPABILITY_STATUSES", "const"],
    ["TelemetryBucketId", "type"],
    ["TelemetryCapabilityStatus", "type"],
    ["TelemetryEventId", "type"],
    ["createAudienceProjectionId", "function"],
    ["createTelemetryBucketId", "function"],
    ["createTelemetryEventId", "function"],
    ["isTelemetryCapabilityStatus", "function"],
  ].sort(([left], [right]) => left.localeCompare(right)));

  assert.deepEqual(
    [...identities.matchAll(/export type (TelemetryBucketId|AudienceProjectionId|TelemetryEventId) =/g)].map((match) => match[1]),
    materialized.slice(0, 3),
  );
  assert.match(capability, /export type TelemetryCapabilityStatus/);
  assert.deepEqual([...index.matchAll(/^export \* from "([^"]+)";/gm)].map((match) => match[1]), [
    "./capability.ts",
    "./identities.ts",
  ]);

  for (const artifact of authorizedNotMaterialized) {
    assert.doesNotMatch(packageSource, new RegExp(`(?:export\\s+(?:type|class|function|const|interface)\\s+${artifact}\\b|${artifact}\\.ts)`));
  }
  for (const artifact of partial) {
    assert.doesNotMatch(packageSource, new RegExp(`export\\s+(?:type|class|function|const|interface)\\s+${artifact}\\b`));
  }
});

test("mechanically denies service, API, infrastructure and compatibility bypasses", () => {
  const packageTree = gitTree("packages/telemetry");
  const packageSource = packageTree.map(gitShow).join("\n");
  const registry = gitShow("packages/generation/src/artifact-authorization.ts");
  const registryReady = exportedStringArray(registry, "telemetryAuthorizedArtifacts");
  const registryPartial = exportedStringArray(registry, "telemetryPartialArtifacts");
  const bypasses = [
    "TelemetryService",
    "TelemetryAPI",
    "TelemetryRepository",
    "TelemetryTopic",
    "TelemetryStream",
    "TelemetryBroker",
    "TelemetryAdapter",
    "TelemetryInfrastructure",
    "CompatibilityMatrix",
    "CompatibilityEvaluator",
  ];

  assert.match(registry, /status: "IMPLEMENTATION_BLOCKED_ARCHITECTURE"/);
  for (const artifact of bypasses) {
    assert.ok(!registryReady.includes(artifact), `${artifact} must not be READY`);
    assert.ok(!registryPartial.includes(artifact), `${artifact} must remain absent and denied by default`);
    assert.doesNotMatch(
      packageSource,
      new RegExp(`export\\s+(?:type|class|function|const|interface)\\s+${artifact}\\b`),
      `${artifact} must not exist in the immutable package tree`,
    );
  }
  for (const path of packageTree) {
    assert.doesNotMatch(path, /(?:service|api|repository|topic|stream|broker|adapter|infrastructure|compatibility)/i);
  }
});

test("records PASS evidence and denies every bypass outside the reviewed boundary", async () => {
  const review = await readFile(reviewPath, "utf8");
  const audit = section(review, "Architecture audit results");
  for (const invariant of [
    "No new Bounded Context",
    "Producer identity ownership",
    "Consumer-local CompatibilityMatrix ownership",
    "Configuration Service distribution-only authority",
    "Telemetry compatibility exclusion",
    "Evidence ownership",
    "Pricing read-only consumption",
    "Authorization consistency",
    "Implementation boundary",
    "No bypass",
    "DEC-065 OPAQUE_TOKEN_V1 semantics",
  ]) {
    assert.match(audit, new RegExp(`\\| ${invariant.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")} \\| PASS \\|`));
  }

  assert.match(review, /READY count: 10/);
  assert.match(review, /PARTIAL count: 23/);
  assert.match(review, /Materialized before C4: 4/);
  assert.match(review, /Authorized but not materialized: 6/);
  assert.match(review, /Every PARTIAL artifact remains denied/i);
  assert.match(review, /No service, API, repository, topic, stream, broker, adapter, infrastructure, CompatibilityMatrix, or compatibility evaluator is authorized/i);
  assert.match(review, /Task C4 may implement only the six authorized version identities/i);
  assert.match(review, /entire `packages\/telemetry` tree/i);
  assert.match(review, /each of the 23 PARTIAL entries was mechanically interpreted/i);
  assert.match(review, /EDGE_RUNTIME\.md.*CAPABILITY_MANAGEMENT\.md/is);
  assert.match(review, /positive and negative contradiction checks/i);
  assert.match(review, /exact public declaration allowlist/i);
  assert.match(review, /mutation fixture.*PARTIAL.*READY/is);
  assert.match(review, /historical V1.*git show.*INVALIDATED/is);
  assert.match(review, /TypeScript compiler AST/i);
  assert.match(review, /second PARTIAL-loop registry\.set.*fails/is);
  assert.match(review, /no export syntax remains unconsumed/i);
  assert.match(review, /literal override between the loops.*fails/is);
  assert.match(review, /alias created before the loops.*alias\.set.*fails/is);
  assert.match(review, /entire immutable registry file/i);
  assert.match(review, /exact top-level AST inventory/i);
  assert.match(review, /unexported class `TelemetryBucket`.*fails/is);
  assert.match(review, /unexported `CompatibilityEvaluator`.*fails/is);
  assert.match(review, /public export allowlist remains separate/i);
});
