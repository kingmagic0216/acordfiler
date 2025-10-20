# ACORD Intake Platform E2E Tests
# Backend: http://localhost:3001
# Frontend: http://localhost:5173

Write-Host "=== ACORD Intake Platform E2E Tests ===" -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health Check
Write-Host "1. Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing
    Write-Host "✅ Health Check: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: API Test Endpoint
Write-Host "`n2. Testing API Test Endpoint..." -ForegroundColor Yellow
try {
    $apiTest = Invoke-WebRequest -Uri http://localhost:3001/api/test -UseBasicParsing
    Write-Host "✅ API Test: $($apiTest.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Mock Login
Write-Host "`n3. Testing Mock Login..." -ForegroundColor Yellow
$loginData = @{
    email = "test@example.com"
    password = "Test!23456"
} | ConvertTo-Json

try {
    $login = Invoke-WebRequest -Uri http://localhost:3001/api/auth/login -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ Login Test: $($login.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Login Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Mock Submissions
Write-Host "`n4. Testing Mock Submissions..." -ForegroundColor Yellow
try {
    $submissions = Invoke-WebRequest -Uri http://localhost:3001/api/submissions -UseBasicParsing
    Write-Host "✅ Submissions Test: $($submissions.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Submissions Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Mock ACORD Generation
Write-Host "`n5. Testing Mock ACORD Generation..." -ForegroundColor Yellow
try {
    $acordGen = Invoke-WebRequest -Uri http://localhost:3001/api/acord/generate/TEST-001 -Method POST -UseBasicParsing
    Write-Host "✅ ACORD Generation Test: $($acordGen.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ ACORD Generation Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== E2E Tests Complete ===" -ForegroundColor Green
Write-Host "Open http://localhost:5173 in your browser to test the frontend!" -ForegroundColor Cyan
