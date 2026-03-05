@echo off
REM Complete Model Installation Script for Windows
REM Installs all dependencies and downloads lightweight pretrained models

echo ======================================================================
echo           COMPLETE MODEL INSTALLATION SCRIPT
echo ======================================================================
echo.
echo This script will install all required packages and download models.
echo.

cd /d "%~dp0"
python scripts/install_all_models.py

pause

