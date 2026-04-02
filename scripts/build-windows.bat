@echo off
REM ============================================================
REM ImageAutoInserter Windows x86-64 打包脚本
REM ============================================================
REM 在Windows x86-64机器上运行此脚本以生成Windows安装包
REM ============================================================

echo ============================================================
echo ImageAutoInserter Windows x86-64 打包脚本
echo ============================================================

REM 检查Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到Node.js，请先安装Node.js
    exit /b 1
)

REM 检查Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到Python，请先安装Python
    exit /b 1
)

echo [信息] Node.js版本:
node --version

echo [信息] Python版本:
python --version

REM 安装依赖
echo [信息] 安装项目依赖...
npm install

REM 执行Windows打包
echo [信息] 开始打包Windows x86-64版本...
npm run dist:win

REM 检查结果
if exist "release\ImageAutoInserter-1.0.1-x64.exe" (
    echo [成功] Windows安装包已生成!
    echo [信息] 文件位置: release\ImageAutoInserter-1.0.1-x64.exe
    dir release\*.exe
) else if exist "release\win-unpacked" (
    echo [成功] Windows便携版已生成!
    echo [信息] 文件位置: release\win-unpacked\ImageAutoInserter.exe
) else (
    echo [警告] 未找到预期的输出文件，请检查构建日志
    dir release\
)

echo ============================================================
echo 打包完成
echo ============================================================
pause
