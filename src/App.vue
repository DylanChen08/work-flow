<template>
  <el-container class="container">
    <el-header>
      <h1>Work Flow</h1>
    </el-header>
    
    <el-main>
      <el-card class="projects-config">
        <template #header>
          <h2>项目配置</h2>
        </template>
        <div v-for="(project, index) in projects" :key="project.path" class="project-item">
          <el-checkbox v-model="project.enabled" />
          <el-input v-model="project.path" placeholder="项目路径" readonly>
            <template #append>
              <el-button @click="selectPath(index)">
                <el-icon>
                  <FolderOpened />
                </el-icon>
              </el-button>
            </template>
          </el-input>
          <el-input v-model="project.name" placeholder="项目名称" />
          <el-select-v2
            v-model="project.selectedUsers"
            :options="project.users?.map((user: string) => ({ value: user, label: user })) || []"
            placeholder="选择用户"
            style="width: 600px"
            multiple
            collapse-tags
            collapse-tags-tooltip
          />
          <el-button type="danger" @click="removeProject(index)" circle>
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <el-button type="primary" @click="addProject">添加项目</el-button>
      </el-card>

      <el-card class="date-range">
        <template #header>
          <h2>时间范围</h2>
        </template>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-card>

      <el-card class="preview">
        <template #header>
          <h2>预览</h2>
        </template>
        <div class="markdown-preview" v-html="previewContent"></div>
      </el-card>
    </el-main>

    <el-footer>
      <el-button type="primary" @click="generateReport">生成周报</el-button>
      <el-button @click="saveConfig">保存配置</el-button>
    </el-footer>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Delete, FolderOpened } from '@element-plus/icons-vue'
import type { Project, WeeklyReport } from './types'
import { marked } from 'marked'
import { ElMessage } from 'element-plus'

const projects = ref<Project[]>([
  {
    path: '',
    name: '智联v1.1.0',
    enabled: true,
    selectedUsers: [],
    users: []
  }
])

const dateRange = ref<[Date, Date]>([
  new Date(new Date().setDate(new Date().getDate() - 7)), // 7天前
  new Date() // 今天
])

const addProject = () => {
  projects.value.push({
    path: '',
    name: '',
    enabled: true,
    selectedUsers: [],
    users: []
  })
}

const removeProject = (index: number) => {
  projects.value.splice(index, 1)
}

const updateGitUsers = async (index: number) => {
  const project = projects.value[index]
  if (!project.path) return

  try {
    const { users } = await window.electronAPI.getGitUsers(project.path)
    project.users = users
    if (users.length > 0 && project.selectedUsers.length === 0) {
      project.selectedUsers = [users[0]]
    }
  } catch (error) {
    console.error('Failed to get git users:', error)
    ElMessage.error('获取用户列表失败')
  }
}

const getCommits = async (project: Project) => {
  if (!project.enabled || !project.path || project.selectedUsers.length === 0) return []
  try {
    if (!dateRange.value?.[0] || !dateRange.value?.[1]) {
      console.error('Invalid date range')
      return []
    }

    const response = await window.electronAPI.generateReport({
      path: project.path,
      startDate: dateRange.value[0].toISOString(),
      endDate: dateRange.value[1].toISOString(),
      authors: project.selectedUsers
    })

    return Array.isArray(response.commits) ? response.commits.map(String) : []
  } catch (error) {
    console.error('Failed to get commits:', error)
    return []
  }
}

const generateReportContent = async () => {
  try {
    let content = '### 本周工作总结\n\n'
    
    for (const project of projects.value) {
      content += `#### ${project.name}\n\n`
      const commits = await getCommits(project)
      if (commits.length > 0) {
        commits.forEach((commit, index) => {
          content += `${index + 1}. ${commit}\n`
        })
      } else {
        content += '暂无提交记录\n'
      }
      content += '\n'
    }
    
    content += `### 下周工作计划\n\n#### 智联\n\n1. 继续优化功能\n2. 处理测试反馈问题\n`
    return content
  } catch (error) {
    console.error('Failed to generate report content:', error)
    return '生成报告失败'
  }
}

const previewContent = ref<string>('')

const updatePreview = async () => {
  try {
    const report = await generateReportContent()
    previewContent.value = marked(report)
  } catch (error) {
    console.error('Failed to update preview:', error)
    previewContent.value = '预览生成失败'
  }
}

watch([projects, dateRange], async () => {
  await updatePreview()
}, { deep: true })

onMounted(async () => {
  await updatePreview()
})

const generateReport = async () => {
  try {
    const content = await generateReportContent()
    const fileName = `task - ${new Date().toISOString().slice(0, 10)}.md`
    await window.electronAPI.saveReport({
      content,
      fileName
    })
    ElMessage.success('周报生成成功')
  } catch (error) {
    console.error('Failed to generate report:', error)
    ElMessage.error('生成周报失败')
  }
}

const saveConfig = () => {
  localStorage.setItem('projects', JSON.stringify(projects.value))
}

console.log('electronAPI available:', window.electronAPI)

const selectPath = async (index: number) => {
  try {
    console.log('Selecting path for index:', index)
    console.log('electronAPI:', window.electronAPI)
    if (!window.electronAPI) {
      ElMessage.error('Electron API not available')
      return
    }
    const path = await window.electronAPI.selectDirectory()
    if (path) {
      projects.value[index].path = path
      await updateGitUsers(index)
      ElMessage.success('目录选择成功')
    }
  } catch (error) {
    console.error('Failed to select directory:', error)
    ElMessage.error('选择目录失败')
  }
}
</script>

<style scoped>
.container {
  height: 100vh;
}

.project-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.markdown-preview {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style> 