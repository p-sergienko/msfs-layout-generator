@echo off
setlocal enabledelayedexpansion

:: Color codes for Windows 10+
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "RED=%ESC%[91m"
set "CYAN=%ESC%[96m"
set "GRAY=%ESC%[90m"
set "RESET=%ESC%[0m"

:: Main Title
echo %CYAN%=== MSFS Layout Generator Setup ===%RESET%
echo.

:: Check if Node.js is installed
echo Checking for Node.js...
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%Node.js is already installed%RESET%
    goto :verify_node
) else (
    echo %YELLOW%Node.js not found. Installing...%RESET%
    goto :install_node
)

:install_node
echo %YELLOW%Downloading Node.js installer...%RESET%

:: Get system architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set "ARCH=x64"
) else if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    set "ARCH=x86"
) else (
    set "ARCH=x64"  :: Default to x64
)

:: Download Node.js
set "NODE_URL=https://nodejs.org/dist/v20.18.0/node-v20.18.0-%ARCH%.msi"
set "NODE_INSTALLER=%TEMP%\nodejs-installer.msi"

echo Downloading Node.js from !NODE_URL!...
powershell -Command "Invoke-WebRequest -Uri '!NODE_URL!' -OutFile '!NODE_INSTALLER!'"

if not exist "!NODE_INSTALLER!" (
    echo %RED%Failed to download Node.js%RESET%
    pause
    exit /b 1
)

echo %YELLOW%Installing Node.js (this may take a moment)...%RESET%
echo You may see a UAC prompt. Please accept to continue.

msiexec /i "!NODE_INSTALLER!" /quiet /norestart

:: Wait a moment for installation
timeout /t 5 /nobreak >nul

:: Refresh PATH
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYSTEM_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"

set "PATH=%SYSTEM_PATH%;%USER_PATH%"

echo %GREEN%Node.js installed successfully%RESET%

:verify_node
:: Verify Node.js installation
for /f "delims=" %%i in ('node --version 2^>nul') do set "NODE_VERSION=%%i"
for /f "delims=" %%i in ('npm --version 2^>nul') do set "NPM_VERSION=%%i"

echo %GREEN%Node.js version: !NODE_VERSION!%RESET%
echo %GREEN%npm version: !NPM_VERSION!%RESET%

:: Check if msfs-layout-generator is already installed
echo.
echo %YELLOW%Checking if msfs-layout-generator is already installed...%RESET%

:: Method 1: Check if msfs-layout command exists
where msfs-layout >nul 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%msfs-layout-generator is already installed%RESET%

    :: Get the version to confirm
    for /f "tokens=*" %%v in ('msfs-layout --version 2^>nul') do set "MSFS_VERSION=%%v"
    if not "!MSFS_VERSION!"=="" (
        echo %GREEN%Version: !MSFS_VERSION!%RESET%
    )

    goto :menu
)

:: Method 2: Check npm global packages
echo Checking npm global packages...
npm list -g msfs-layout-generator >nul 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%msfs-layout-generator is already installed globally%RESET%
    goto :menu
)

:: Install msfs-layout-generator if not found
echo %YELLOW%msfs-layout-generator not found. Installing...%RESET%
call npm install -g msfs-layout-generator

if %errorlevel% neq 0 (
    echo %RED%Failed to install msfs-layout-generator%RESET%
    echo Make sure you have administrator privileges.
    echo.
    echo If the package is already installed but not in PATH, you can:
    echo 1. Check if msfs-layout works from another command prompt
    echo 2. Restart your computer to update PATH
    echo 3. Manually add npm global bin folder to PATH
    echo.
    echo Common npm global bin paths:
    echo - %APPDATA%\npm
    echo - %ProgramFiles%\nodejs
    echo.
    pause
    exit /b 1
)

echo %GREEN%msfs-layout-generator installed successfully%RESET%

:: Main menu loop
:menu
cls
echo %CYAN%=== MSFS Layout Generator ===%RESET%
echo %CYAN%How would you like to process directories?%RESET%
echo 1. Process current directory (where this script is)
echo 2. Process a single folder ("C:\Your\Folder\With\Your\Add-on")
echo 3. Process all immediate subfolders within a directory (do not process the whole community folder!)
echo 4. Process from a .txt file with directory paths
echo 5. Watch folder for changes (continuous regeneration)
echo 6. Exit
echo.

set "CHOICE="
set /p CHOICE="Enter your choice (1-6): "

:: Validate input
if "%CHOICE%"=="" (
    echo %RED%Please enter a choice%RESET%
    timeout /t 2 /nobreak >nul
    goto :menu
)

if "%CHOICE%"=="6" (
    echo %CYAN%Exiting...%RESET%
    timeout /t 2 /nobreak >nul
    exit /b 0
)

if "%CHOICE%"=="1" (
    :: Process current directory
    echo %YELLOW%Will process: %CD%%RESET%

    echo.
    echo %CYAN%Running msfs-layout on current directory...%RESET%
    echo %GRAY%Command: msfs-layout "%CD%"%RESET%
    echo.

    :: Run command and capture output
    echo %CYAN%Processing... Please wait...%RESET%
    echo.

    msfs-layout "%CD%"

    if %errorlevel% equ 0 (
        echo.
        echo %GREEN%Processing completed successfully!%RESET%
    ) else (
        echo.
        echo %YELLOW%Processing completed with warnings/errors%RESET%
    )

    echo.
    echo %CYAN%Press any key to return to menu...%RESET%
    pause >nul
    goto :menu

) else if "%CHOICE%"=="2" (
    :: Process a single folder
    set "SINGLE_DIR="
    set /p SINGLE_DIR="Enter the folder path to process: "

    if "!SINGLE_DIR!"=="" (
        echo %RED%No folder path entered!%RESET%
        echo.
        pause
        goto :menu
    )

    :: Check if path exists (handle both quoted and unquoted paths)
    set "CHECK_DIR=!SINGLE_DIR!"
    if "!CHECK_DIR:~0,1!"=="""" set "CHECK_DIR=!CHECK_DIR:~1,-1!"

    if not exist "!CHECK_DIR!\" (
        echo %RED%Folder not found: !SINGLE_DIR!%RESET%
        echo.
        pause
        goto :menu
    )

    echo %YELLOW%Will process single folder: !SINGLE_DIR!%RESET%

    echo.
    echo %CYAN%Running msfs-layout on single folder...%RESET%
    echo %GRAY%Command: msfs-layout "!SINGLE_DIR!"%RESET%
    echo.

    :: Ensure the path is quoted
    echo %CYAN%Processing... Please wait...%RESET%
    echo.

    if "!SINGLE_DIR:~0,1!"=="""" (
        msfs-layout !SINGLE_DIR!
    ) else (
        msfs-layout "!SINGLE_DIR!"
    )

    if %errorlevel% equ 0 (
        echo.
        echo %GREEN%Processing completed successfully!%RESET%
    ) else (
        echo.
        echo %YELLOW%Processing completed with warnings/errors%RESET%
    )

    echo.
    echo %CYAN%Press any key to return to menu...%RESET%
    pause >nul
    goto :menu

) else if "%CHOICE%"=="3" (
    :: Process all IMMEDIATE subfolders within a directory (top-level only)
    set "TARGET_DIR="
    set /p TARGET_DIR="Enter the directory path: "

    if "!TARGET_DIR!"=="" (
        echo %RED%No directory path entered!%RESET%
        echo.
        pause
        goto :menu
    )

    :: Check if path exists (handle both quoted and unquoted paths)
    set "CHECK_DIR=!TARGET_DIR!"
    if "!CHECK_DIR:~0,1!"=="""" set "CHECK_DIR=!CHECK_DIR:~1,-1!"

    if not exist "!CHECK_DIR!\" (
        echo %RED%Directory not found: !TARGET_DIR!%RESET%
        echo.
        pause
        goto :menu
    )

    echo %YELLOW%Collecting immediate subdirectories from: !TARGET_DIR!%RESET%

    :: Collect only immediate subdirectories (not recursive)
    set "COUNT=0"
    set "DIRECTORIES="

    :: Use FOR /D without /R to get only immediate subdirectories
    for /d %%d in ("!CHECK_DIR!\*") do (
        set "DIRECTORIES=!DIRECTORIES! "%%~d""
        set /a COUNT+=1
    )

    echo %YELLOW%Found !COUNT! immediate subdirectories to process%RESET%

    :: Run msfs-layout if we found directories
    if not "!DIRECTORIES!"=="" (
        echo.
        echo %CYAN%Running msfs-layout on immediate subdirectories...%RESET%

        :: Trim leading space from directories
        set "DIRECTORIES=!DIRECTORIES:~1!"

        echo %GRAY%Command: msfs-layout !DIRECTORIES!%RESET%
        echo.

        echo %CYAN%Processing... Please wait...%RESET%
        echo.

        msfs-layout !DIRECTORIES!

        if %errorlevel% equ 0 (
            echo.
            echo %GREEN%Processing completed successfully!%RESET%
        ) else (
            echo.
            echo %YELLOW%Processing completed with warnings/errors%RESET%
        )

        echo.
        echo %CYAN%Press any key to return to menu...%RESET%
        pause >nul
        goto :menu

    ) else (
        echo %RED%No immediate subdirectories found to process!%RESET%
        echo.
        pause
        goto :menu
    )

) else if "%CHOICE%"=="4" (
    :: Process from a .txt file
    set "TXT_FILE="
    set /p TXT_FILE="Enter the path to .txt file: "

    if "!TXT_FILE!"=="" (
        echo %RED%No file path entered!%RESET%
        echo.
        pause
        goto :menu
    )

    :: Check if path exists (handle both quoted and unquoted paths)
    set "CHECK_FILE=!TXT_FILE!"
    if "!CHECK_FILE:~0,1!"=="""" set "CHECK_FILE=!CHECK_FILE:~1,-1!"

    if not exist "!CHECK_FILE!" (
        echo %RED%File not found: !TXT_FILE!%RESET%
        echo.
        pause
        goto :menu
    )

    echo %YELLOW%Reading directories from file: !TXT_FILE!%RESET%

    :: Read directories from file
    set "COUNT=0"
    set "DIRECTORIES="

    for /f "usebackq delims=" %%d in ("!CHECK_FILE!") do (
        :: Trim whitespace
        set "LINE=%%d"
        set "LINE=!LINE: =!"
        if not "!LINE!"=="" (
            if exist "%%d\" (
                set "DIRECTORIES=!DIRECTORIES! "%%d""
                set /a COUNT+=1
            ) else (
                echo %GRAY%Skipping non-existent path: %%d%RESET%
            )
        )
    )

    echo %YELLOW%Found !COUNT! valid directories in file%RESET%

    :: Run msfs-layout if we found directories
    if not "!DIRECTORIES!"=="" (
        echo.
        echo %CYAN%Running msfs-layout on directories from file...%RESET%

        :: Trim leading space from directories
        set "DIRECTORIES=!DIRECTORIES:~1!"

        echo %GRAY%Command: msfs-layout !DIRECTORIES!%RESET%
        echo.

        echo %CYAN%Processing... Please wait...%RESET%
        echo.

        msfs-layout !DIRECTORIES!

        if %errorlevel% equ 0 (
            echo.
            echo %GREEN%Processing completed successfully!%RESET%
        ) else (
            echo.
            echo %YELLOW%Processing completed with warnings/errors%RESET%
        )

        echo.
        echo %CYAN%Press any key to return to menu...%RESET%
        pause >nul
        goto :menu

    ) else (
        echo %RED%No valid directories found in file!%RESET%
        echo.
        pause
        goto :menu
    )

) else if "%CHOICE%"=="5" (
     :: WATCH MODE - Polling based
     set "WATCH_DIR="
     set /p WATCH_DIR="Enter the folder path to watch: "

     if "!WATCH_DIR!"=="" (
         echo %RED%No folder path entered!%RESET%
         echo.
         pause
         goto :menu
     )

    :: Run the npm package
    call msfs-layout "!WATCH_DIR!" --watch

    echo %RED%Invalid choice! Please enter 1-5%RESET%
    echo.
    pause
    goto :menu
)

:: This should never be reached, but just in case
goto :menu