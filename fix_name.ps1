$srcPath = "c:\Users\yashw\OneDrive\New folder\src"
$files = Get-ChildItem -Path $srcPath -Recurse -Include "*.tsx","*.ts"
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    if ($content -match 'Ashwanth') {
        $newContent = $content -replace 'Ashwanth', 'Yashwanth'
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.Name)"
    }
}
Write-Host "Done."
