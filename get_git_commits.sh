#!/bin/bash

# 保存当前目录
CURRENT_DIR=$(pwd)

# 获取当前日期并格式化为YYYYMMDD
DATE=$(date +%Y%m%d)
REPORT_FILE="task - $DATE.md"

# 定义项目目录数组
projects=(
    "../sso-login:智联v1.1.0"
    "../acs:智联v1.1.0"
    "../mv-video-platform:智联v1.1.0"
    "../mv-cloudgate-terminal:掌静脉项目"
)

# 创建周报文件并写入标题
cat > "$REPORT_FILE" << EOF
### 本周工作总结

EOF

# 遍历每个项目
for project in "${projects[@]}"; do
    # 分割项目路径和显示名称
    IFS=':' read -r path name <<< "$project"
    
    # 切换到项目目录
    cd "$CURRENT_DIR/$path" 2>/dev/null || {
        echo "错误：无法进入目录 $path"
        continue
    }
    
    # 检查是否是git仓库
    if [ ! -d ".git" ]; then
        echo "错误：$path 不是一个git仓库"
        cd "$CURRENT_DIR"
        continue
    fi
    
    # 获取当前git用户名
    CURRENT_USER=$(git config user.name)
    
    # 写入项目标题到周报
    echo "#### $name" >> "$CURRENT_DIR/$REPORT_FILE"
    echo "" >> "$CURRENT_DIR/$REPORT_FILE"
    
    # 获取提交记录，处理后写入文件
    counter=1
    git log --since="1 week ago" --author="$CURRENT_USER" --pretty=format:"%s" --abbrev-commit | sort -r | while read line; do
        # 移除前缀（例如 feat(xxx):, fix(xxx):, refactor(xxx): 等）
        cleaned_line=$(echo "$line" | sed -E 's/^(feat|fix|refactor|style|perf|test|docs|chore|build|ci|revert|merge)(\([^)]*\))?:\s*//')
        echo "$counter. $cleaned_line" >> "$CURRENT_DIR/$REPORT_FILE"
        counter=$((counter + 1))
    done
    echo -e "\n" >> "$CURRENT_DIR/$REPORT_FILE"
    
    # 返回原始目录
    cd "$CURRENT_DIR"
done

# 添加下周计划模板
cat >> "$REPORT_FILE" << EOF
### 下周工作计划

#### 智联

1. 继续优化功能
2. 处理测试反馈问题

#### 掌静脉项目

1. 继续优化系统功能
2. 处理测试反馈问题

---
EOF

echo "已生成周报：$REPORT_FILE"