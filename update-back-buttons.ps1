# Script to update all back buttons in detail pages from absolute /index.html to relative paths

$detailsPath = "c:\Users\user\Desktop\New Folder 2 - Copy\details"
$files = Get-ChildItem -Path $detailsPath -Recurse -Filter "*.html" -Exclude "template.html"

$replacements = 0
$total = 0

foreach ($file in $files) {
    $total++
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Check if file has /index.html in it
    if ($content -match 'href="/index.html"') {
        # All detail pages are in subdirectories, so they need ../../index.html
        # This works because:
        # /details/Category/file.html needs ../../ to go to /details/../.. = /
        # /details/file.html needs ../../ too, and it just goes ../.. which is fine
        $content = $content -replace 'href="/index.html"', 'href="../../index.html"'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content
            $replacements++
        }
    }
}

Write-Host "Total files processed: $total"
Write-Host "Files updated: $replacements"

