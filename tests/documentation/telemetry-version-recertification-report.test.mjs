import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const repositoryRoot = new URL("../../", import.meta.url);
const auditedHead = "d5d2f295b07a275a6fb4a0597abadebdfc4283a9";
const reportPath = "docs/reports/TELEMETRY_VERSION_RECERTIFICATION_REPORT_V1.md";

const ready = Object.freeze([
  "TelemetryBucketId", "AudienceProjectionId", "TelemetryEventId",
  "TelemetryCapabilityStatus", "TelemetrySchemaVersion", "CollectorVersion",
  "CapabilityVersion", "CollectionPolicyVersion", "AudienceProjectionVersion",
  "AudienceProjectionPolicyVersion",
]);

const partial = Object.freeze([
  "TelemetryBucket", "TelemetryBucketAccepted", "TelemetryBucketRejected",
  "AudienceProjection", "TelemetryCaptured", "TelemetryBucketClosed",
  "EdgeTelemetryCapabilityChanged", "EdgeTelemetryIncidentReported",
  "TelemetryValidationIncidentReported", "TelemetryCapabilityChanged",
  "TelemetryIncidentReported", "CapabilityDeclared", "CapabilityValidated",
  "CapabilityRejected", "CapabilityActivated", "CapabilityDegraded",
  "CapabilitySuspended", "CapabilityRecovered", "CapabilityRetired",
  "AudienceProjectionApplier", "AudienceProjectionProduced",
  "AudienceProjectionExpired", "AudienceProjectionInvalidated",
]);

const gitShow = (path) => execFileSync("git", ["show", `${auditedHead}:${path}`], {
  cwd: repositoryRoot,
  encoding: "utf8",
});

const gitTree = (path) => execFileSync(
  "git", ["ls-tree", "-r", "--name-only", auditedHead, "--", path],
  { cwd: repositoryRoot, encoding: "utf8" },
).trim().split(/\r?\n/).filter(Boolean);

const currentRead = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const manifest = (source, name) => {
  const match = source.match(new RegExp(`^${name}: (\\[[^\\n]+\\])$`, "m"));
  assert.ok(match, `${name} must exist`);
  return JSON.parse(match[1]);
};

const bindingNames = (name) => {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingNames(element.name));
};

const modifierNames = (node) => (node.modifiers ?? [])
  .map((modifier) => ts.tokenToString(modifier.kind) ?? ts.SyntaxKind[modifier.kind]);

const topLevelInventory = (path, source) => {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return file.statements.flatMap((statement) => {
    if (ts.isImportDeclaration(statement)) {
      const names = [];
      const clause = statement.importClause;
      if (clause?.name) names.push(clause.name.text);
      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) names.push(clause.namedBindings.name.text);
        else names.push(...clause.namedBindings.elements.map((element) => element.name.text));
      }
      return [`import:${statement.moduleSpecifier.text}:${names.join(",")}`];
    }
    if (ts.isVariableStatement(statement)) {
      const kind = statement.declarationList.flags & ts.NodeFlags.Const
        ? "const" : statement.declarationList.flags & ts.NodeFlags.Let ? "let" : "var";
      return statement.declarationList.declarations.flatMap((declaration) =>
        bindingNames(declaration.name).map((name) =>
          `${kind}:${name}:${modifierNames(statement).join(",")}`));
    }
    if (ts.isForOfStatement(statement) || ts.isForInStatement(statement)) {
      assert.ok(ts.isVariableDeclarationList(statement.initializer));
      return statement.initializer.declarations.flatMap((declaration) =>
        bindingNames(declaration.name).map((name) =>
          `${ts.isForOfStatement(statement) ? "for-of" : "for-in"}:${name}`));
    }
    if (
      ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
      ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)
    ) {
      const kind = ts.isTypeAliasDeclaration(statement) ? "type"
        : ts.isInterfaceDeclaration(statement) ? "interface"
          : ts.isClassDeclaration(statement) ? "class"
            : ts.isFunctionDeclaration(statement) ? "function"
              : ts.isEnumDeclaration(statement) ? "enum" : "module";
      const name = statement.name && ts.isIdentifier(statement.name)
        ? statement.name.text : "<anonymous>";
      return [`${kind}:${name}:${modifierNames(statement).join(",")}`];
    }
    if (ts.isExportDeclaration(statement)) {
      return [`export:${statement.exportClause?.getText(file) ?? "*"}:${statement.moduleSpecifier?.text ?? "<local>"}`];
    }
    if (ts.isExportAssignment(statement)) {
      return [`export-assignment:${statement.isExportEquals ? "equals" : "default"}`];
    }
    if (ts.isExpressionStatement(statement)) {
      return [`expression:${statement.expression.getText(file)}`];
    }
    assert.fail(`unconsumed top-level statement in ${path}: ${statement.getText(file)}`);
  });
};

const expectedInventory = Object.freeze({
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
    "type:TelemetryBucketId:export", "type:AudienceProjectionId:export",
    "type:TelemetryEventId:export", "for-of:artifact",
    "function:createTelemetryBucketId:export",
    "function:createAudienceProjectionId:export",
    "function:createTelemetryEventId:export",
  ]),
  "packages/telemetry/src/index.ts": Object.freeze([
    "export:*:./capability.ts", "export:*:./identities.ts", "export:*:./versions.ts",
  ]),
  "packages/telemetry/src/versions.ts": Object.freeze([
    "import:../../generation/src/index.ts:assertGenerationAuthorized",
    "import:../../kernel/src/index.ts:createOpaqueId,OpaqueId",
    "type:TelemetrySchemaVersion:export", "type:CollectorVersion:export",
    "type:CapabilityVersion:export", "type:CollectionPolicyVersion:export",
    "type:AudienceProjectionVersion:export",
    "type:AudienceProjectionPolicyVersion:export", "for-of:artifact",
    "const:opaqueTokenV1:", "class:InvalidVersionIdentityRepresentation:",
    "function:createVersionIdentity:", "function:createTelemetrySchemaVersion:export",
    "function:createCollectorVersion:export", "function:createCapabilityVersion:export",
    "function:createCollectionPolicyVersion:export",
    "function:createAudienceProjectionVersion:export",
    "function:createAudienceProjectionPolicyVersion:export",
  ]),
});

const publicExports = (sources) => {
  const cache = new Map();
  const visit = (path) => {
    if (cache.has(path)) return cache.get(path);
    const source = sources[path];
    assert.ok(source, `unresolved module ${path}`);
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const found = new Set();
    cache.set(path, found);
    const add = (name) => {
      assert.ok(!found.has(name), `duplicate public export ${name}`);
      found.add(name);
    };
    for (const statement of file.statements) {
      if (ts.isExportAssignment(statement)) assert.fail(`export assignment in ${path}`);
      if (ts.isExportDeclaration(statement)) {
        assert.ok(statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier));
        assert.ok(statement.moduleSpecifier.text.startsWith("./"), `external re-export in ${path}`);
        const target = `${path.slice(0, path.lastIndexOf("/") + 1)}${statement.moduleSpecifier.text.slice(2)}`;
        const targetExports = visit(target);
        if (!statement.exportClause) for (const name of targetExports) add(name);
        else if (ts.isNamedExports(statement.exportClause)) {
          for (const item of statement.exportClause.elements) add(item.name.text);
        } else assert.fail(`namespace export in ${path}`);
        continue;
      }
      if (!statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
      assert.ok(!statement.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          assert.ok(ts.isIdentifier(declaration.name));
          add(declaration.name.text);
        }
      } else {
        assert.ok(statement.name && ts.isIdentifier(statement.name));
        add(statement.name.text);
      }
    }
    return found;
  };
  return [...visit("packages/telemetry/src/index.ts")].sort();
};

const expectedPublicExports = Object.freeze([
  "AudienceProjectionId", "AudienceProjectionPolicyVersion", "AudienceProjectionVersion",
  "CapabilityVersion", "CollectionPolicyVersion", "CollectorVersion",
  "TELEMETRY_CAPABILITY_STATUSES", "TelemetryBucketId", "TelemetryCapabilityStatus",
  "TelemetryEventId", "TelemetrySchemaVersion", "createAudienceProjectionId",
  "createAudienceProjectionPolicyVersion", "createAudienceProjectionVersion",
  "createCapabilityVersion", "createCollectionPolicyVersion", "createCollectorVersion",
  "createTelemetryBucketId", "createTelemetryEventId", "createTelemetrySchemaVersion",
  "isTelemetryCapabilityStatus",
].sort());

const auditPackage = (sources) => {
  assert.deepEqual(Object.keys(sources).sort(), [
    "packages/telemetry/package.json", "packages/telemetry/src/capability.ts",
    "packages/telemetry/src/identities.ts", "packages/telemetry/src/index.ts",
    "packages/telemetry/src/versions.ts",
  ]);
  for (const [path, expected] of Object.entries(expectedInventory)) {
    assert.deepEqual(topLevelInventory(path, sources[path]), expected, path);
  }
  assert.deepEqual(publicExports(sources), expectedPublicExports);

  const completeSource = Object.values(sources).join("\n");
  for (const artifact of partial) {
    assert.doesNotMatch(completeSource, new RegExp(`(?:class|interface|type|function|const|let|var|enum|namespace)\\s+${artifact}\\b`));
  }
  for (const forbidden of [
    "TelemetryService", "TelemetryAPI", "TelemetryRepository", "TelemetryAdapter",
    "TelemetryInfrastructure", "CompatibilityMatrix", "CompatibilityEvaluator",
    "CompatibilityDecision", "CompatibilityEvaluationResult", "CompatibilityEvaluationCause",
  ]) {
    assert.doesNotMatch(completeSource, new RegExp(`(?:class|interface|type|function|const|let|var|enum|namespace)\\s+${forbidden}\\b`));
  }
};

test("version recertification report records the exact post-C4 authorization boundary", () => {
  const gate = gitShow("docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md");
  const report = currentRead(reportPath);
  assert.deepEqual(manifest(gate, "READY_MANIFEST"), ready);
  assert.deepEqual(manifest(gate, "PARTIAL_MANIFEST"), partial);
  assert.match(report, new RegExp(`AUDITED_IMPLEMENTATION_HEAD: ${auditedHead}`));
  assert.match(report, /READY_COUNT: 10/);
  assert.match(report, /PARTIAL_COUNT: 23/);
  assert.match(report, /MATERIALIZED_READY_COUNT: 10/);
  assert.match(report, /ABSENT_PARTIAL_COUNT: 23/);
  assert.match(report, /IMMUTABLE_PACKAGE_AST_AUDIT: PASS/);
  for (const artifact of ready) assert.match(report, new RegExp(`\\| \\\`${artifact}\\\` \\| MATERIALIZED \\|`));
  for (const artifact of partial) assert.match(report, new RegExp(`\\| \\\`${artifact}\\\` \\| ABSENT \\|`));
});

test("audits every immutable Telemetry source with exact AST and public-export inventories", () => {
  execFileSync("git", ["cat-file", "-e", `${auditedHead}^{commit}`], { cwd: repositoryRoot });
  const tree = gitTree("packages/telemetry");
  const sources = Object.fromEntries(tree.map((path) => [path, gitShow(path)]));
  auditPackage(sources);
});

test("immutable AST audit rejects an unexported PARTIAL artifact", () => {
  const tree = gitTree("packages/telemetry");
  const sources = Object.fromEntries(tree.map((path) => [path, gitShow(path)]));
  assert.throws(() => auditPackage({
    ...sources,
    "packages/telemetry/src/versions.ts": `${sources["packages/telemetry/src/versions.ts"]}\nclass TelemetryBucket {}\n`,
  }), /packages\/telemetry\/src\/versions\.ts/);
});

test("immutable AST audit rejects an unexported compatibility mechanism", () => {
  const tree = gitTree("packages/telemetry");
  const sources = Object.fromEntries(tree.map((path) => [path, gitShow(path)]));
  assert.throws(() => auditPackage({
    ...sources,
    "packages/telemetry/src/versions.ts": `${sources["packages/telemetry/src/versions.ts"]}\nconst CompatibilityEvaluator = () => undefined;\n`,
  }), /packages\/telemetry\/src\/versions\.ts/);
});

test("report denies original Telemetry Task 4 from the immutable gate", () => {
  const gate = gitShow("docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md");
  const report = currentRead(reportPath);
  assert.match(gate, /## Artifact: TelemetryBucket\s+Status: `IMPLEMENTATION_PARTIAL`/);
  assert.match(report, /TELEMETRY_BUCKET_STATUS: IMPLEMENTATION_PARTIAL/);
  assert.match(report, /ORIGINAL_TASK_4_ELIGIBILITY: DENIED/);
  assert.match(report, /NEXT_AUTHORIZED_BOUNDARY: NONE/);
  assert.match(report, /complete construction error contract/i);
  assert.match(report, /consumer-owned compatibility evaluation/i);
  assert.match(report, /No original Task 4 code was implemented/i);
});

test("immutable version constructors remain identity-only", () => {
  const versions = gitShow("packages/telemetry/src/versions.ts");
  const report = currentRead(reportPath);
  assert.doesNotMatch(versions, /Compatibility(Matrix|Decision|Evaluation|Result|Cause)/);
  assert.doesNotMatch(versions, /SUPPORTED|DEPRECATED|EXPERIMENTAL|UNSUPPORTED/);
  assert.match(report, /VERSION_CONSTRUCTOR_COMPATIBILITY_EVALUATION: ABSENT/);
  assert.match(report, /OPAQUE_TOKEN_V1/);
  assert.match(report, /INVALID_VERSION_IDENTITY_REPRESENTATION/);
});
