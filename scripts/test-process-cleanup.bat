@echo off
chcp 65001 >nul
echo ==========================================
echo  ImageAutoInserter 进程清理测试 (Windows)
echo ==========================================
echo.

set APP_NAME=ImageAutoInserter.exe
set PYTHON_EXE=python.exe
set NODE_EXE=node.exe

echo [1/5] 检查应用启动前的进程状态...
echo.
call :check_processes "初始状态"
echo.

echo [2/5] 请手动启动 ImageAutoInserter 应用
echo     启动后按任意键继续...
pause >nul
echo.

echo [3/5] 检查应用运行中的进程...
echo.
call :check_processes "应用运行中"
echo.

echo [4/5] 请关闭 ImageAutoInserter 应用
echo     (点击窗口关闭按钮或使用 Alt+F4)
echo     关闭后按任意键继续...
pause >nul
echo.

echo [5/5] 等待 3 秒后检查进程残留...
timeout /t 3 /nobreak >nul
echo.
call :check_processes "应用关闭后"
echo.

echo ==========================================
echo 测试完成！请检查上方结果：
echo   - 如果所有进程数为 0，表示清理成功
echo   - 如果有残留进程，需要进一步调查
echo ==========================================
pause
exit /b

:check_processes
echo ----- %~1 -----
echo.

echo ImageAutoInserter 进程数:
for /f "tokens=*" %%a in ('tasklist /FI "IMAGENAME eq %APP_NAME%" 2^>nul ^| find /C "%APP_NAME%"') do (
    if "%%a"=="0" (
        echo   [OK] 0 个进程
    ) else (
        echo   [WARNING] %%a 个进程在运行
        tasklist /FI "IMAGENAME eq %APP_NAME%" 2>nul | findstr "%APP_NAME%"
    )
)
echo.

echo Python 进程数:
for /f "tokens=*" %%a in ('tasklist /FI "IMAGENAME eq %PYTHON_EXE%" 2^>nul ^| find /C "%PYTHON_EXE%"') do (
    if "%%a"=="0" (
        echo   [OK] 0 个进程
    ) else (
        echo   [WARNING] %%a 个进程在运行
        tasklist /FI "IMAGENAME eq %PYTHON_EXE%" 2>nul | findstr "%PYTHON_EXE%"
    )
)
echo.

echo Node/Vite 进程数:
for /f "tokens=*" %%a in ('tasklist /FI "IMAGENAME eq %NODE_EXE%" 2^>nul ^| find /C "%NODE_EXE%"') do (
    if "%%a"=="0" (
        echo   [OK] 0 个进程
    ) else (
        echo   [WARNING] %%a 个进程在运行
        tasklist /FI "IMAGENAME eq %NODE_EXE%" 2>nul | findstr "%NODE_EXE%"
    )
)
echo.

echo Electron 相关进程:
tasklist /FI "IMAGENAME eq electron.exe" 2>nul | findstr "electron.exe" >nul
if %errorlevel%==0 (
    echo   [WARNING] 发现 Electron 进程
    tasklist /FI "IMAGENAME eq electron.exe" 2>nul | findstr "electron.exe"
) else (
    echo   [OK] 无 Electron 进程
)
echo.

exit /b
