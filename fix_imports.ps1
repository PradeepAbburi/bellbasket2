$files = Get-ChildItem src -Filter *.tsx -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName
    if ($content -match '@/context/appStore') {
        $newContent = $content -replace '@/context/appStore', '@/context/AppContext'
        $newContent | Set-Content $file.FullName
        Write-Host "Updated $($file.FullName)"
    }
}
