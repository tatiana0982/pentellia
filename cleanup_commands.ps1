# Pentellia Production Cleanup Script
# Run from project root in PowerShell: .\cleanup_commands.ps1

Write-Host "=== Pentellia Production Cleanup ===" -ForegroundColor Cyan

# 1. REMOVE UNUSED PACKAGES
Write-Host "`n[1/6] Removing unused packages..." -ForegroundColor Yellow
npm uninstall axios jspdf jspdf-autotable react-to-pdf lottie-react framer-motion genkit @genkit-ai/google-genai @genkit-ai/next genkit-cli date-fns dotenv patch-package embla-carousel-react react-day-picker

# 2. REMOVE CONSOLE LOGS from all API routes (production)
Write-Host "`n[2/6] Removing console.log from API routes..." -ForegroundColor Yellow

# Remove console.log lines (keep console.error)
Get-ChildItem -Path "src\app\api" -Recurse -Include "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    # Remove console.log lines
    $content = $content -replace '(?m)^\s*console\.log\([^)]*(?:\([^)]*\)[^)]*)*\);\s*\n', ''
    # Remove console.warn lines  
    $content = $content -replace '(?m)^\s*console\.warn\([^)]*(?:\([^)]*\)[^)]*)*\);\s*\n', ''
    Set-Content -Path $_.FullName -Value $content -NoNewline
}
Write-Host "  Done" -ForegroundColor Green

# 3. REMOVE DUMB COMMENTS (phase comments, TODO, old notes)
Write-Host "`n[3/6] Removing phase/todo/legacy comments..." -ForegroundColor Yellow

Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    # Remove Phase N: comments
    $content = $content -replace '(?m)^\s*//\s*Phase \d[^`n]*\n', ''
    # Remove TODO/FIXME/HACK
    $content = $content -replace '(?m)^\s*//\s*(TODO|FIXME|HACK|XXX|NOTE|FIX):[^\n]*\n', ''
    # Remove separator lines like // ─────────────────
    $content = $content -replace '(?m)^\s*//\s*[─═\-]{10,}[^\n]*\n', ''
    Set-Content -Path $_.FullName -Value $content -NoNewline
}
Write-Host "  Done" -ForegroundColor Green

# 4. REMOVE UNUSED UI COMPONENTS (shadcn components not imported in app)
Write-Host "`n[4/6] Removing unused UI components..." -ForegroundColor Yellow

$unusedComponents = @(
    "src\components\ui\accordion.tsx",
    "src\components\ui\collapsible.tsx",
    "src\components\ui\menubar.tsx",
    "src\components\ui\popover.tsx",
    "src\components\ui\progress.tsx",
    "src\components\ui\radio-group.tsx",
    "src\components\ui\slider.tsx",
    "src\components\ui\calendar.tsx",
    "src\components\ui\carousel.tsx"
)

foreach ($file in $unusedComponents) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Removed: $file" -ForegroundColor DarkGray
    }
}

# 5. REMOVE UNUSED RADIX PACKAGES (after removing component files)
Write-Host "`n[5/6] Removing unused radix packages..." -ForegroundColor Yellow
npm uninstall @radix-ui/react-accordion @radix-ui/react-collapsible @radix-ui/react-menubar @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-slider

# 6. REMOVE adminDb and adminStorage (unused Firebase exports)
Write-Host "`n[6/6] Cleaning Firebase admin exports..." -ForegroundColor Yellow
$fbAdmin = Get-Content "src\config\firebaseAdmin.ts" -Raw
$fbAdmin = $fbAdmin -replace 'export const adminDb = admin\.firestore\(\);[\r\n]', ''
$fbAdmin = $fbAdmin -replace 'export const adminStorage = admin\.storage\(\);[\r\n]', ''
Set-Content -Path "src\config\firebaseAdmin.ts" -Value $fbAdmin -NoNewline
Write-Host "  Done" -ForegroundColor Green

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Cyan
Write-Host "Run: npm run build" -ForegroundColor White
