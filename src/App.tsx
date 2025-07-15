import { defineComponent, ref, computed, watch, onMounted, h } from 'vue'
import { Delete, FolderOpened } from '@element-plus/icons-vue'
import { ElContainer, ElHeader, ElMain, ElFooter, ElCard, ElCheckbox, ElInput, ElSelect, ElButton, ElDatePicker, ElMessage, ElIcon } from 'element-plus'
import type { Project, WeeklyReport } from './types'
import { marked } from 'marked'

export default defineComponent({
  name: 'App',
  setup() {
    const projects = ref<Project[]>([
      {
        path: '',
        name: 'project - v1.1.0',
        enabled: true,
        selectedUsers: [],
        users: []
      }
    ])

    const dateRange = ref<[Date, Date]>([
      new Date(new Date().setDate(new Date().getDate() - 7)), // 7天前
      new Date() // 今天
    ])

    const previewContent = ref<string>('')

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

        // 强制转换为纯字符串
        const startDate = new Date(dateRange.value[0]).toISOString()
        const endDate = new Date(dateRange.value[1]).toISOString()
        const authors = project.selectedUsers.map(u => String(u))
        const path = String(project.path)

        // 关键：深拷贝为纯 JSON 数据
        const payload = JSON.parse(JSON.stringify({
          path,
          startDate,
          endDate,
          authors
        }))

        console.log('generateReport payload:', payload)

        const response = await window.electronAPI.generateReport(payload)

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

    const updatePreview = async () => {
      try {
        const report = await generateReportContent()
        previewContent.value = marked(report) as string
      } catch (error) {
        console.error('Failed to update preview:', error)
        previewContent.value = '预览生成失败'
      }
    }

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

    const selectPath = async (index: number) => {
      try {
        console.log('Selecting path for index:', index)
        console.log('electronAPI:', window.electronAPI)
        if (!window.electronAPI) {
          ElMessage.error('Electron API not available')
          return
        }
        const selectedPath = await window.electronAPI.selectDirectory()
        if (selectedPath) {
          projects.value[index].path = selectedPath
          await updateGitUsers(index)
          ElMessage.success('目录选择成功')
        }
      } catch (error) {
        console.error('Failed to select directory:', error)
        ElMessage.error('选择目录失败')
      }
    }

    watch([projects, dateRange], async () => {
      await updatePreview()
    }, { deep: true })

    onMounted(async () => {
      await updatePreview()
    })

    console.log('electronAPI available:', window.electronAPI)

    return () => (
      <ElContainer class="container">
        <ElHeader>
          <h1>Work Flow</h1>
        </ElHeader>
        
        <ElMain>
          <ElCard class="projects-config">
            {{
              header: () => <h2>项目配置</h2>,
              default: () => (
                <>
                  {projects.value.map((project, index) => (
                    <div key={project.path} class="project-item">
                      <ElCheckbox v-model={project.enabled} />
                      <ElInput v-model={project.path} placeholder="项目路径" readonly>
                        {{
                          append: () => (
                            <ElButton onClick={() => selectPath(index)}>
                              <ElIcon><FolderOpened /></ElIcon>
                            </ElButton>
                          )
                        }}
                      </ElInput>
                      <ElInput v-model={project.name} placeholder="项目名称" />
                      <ElSelect
                        v-model={project.selectedUsers}
                        placeholder="选择用户"
                        style="width: 600px"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                      >
                        {project.users?.map((user: string) => (
                          <ElSelect.Option key={user} value={user} label={user} />
                        ))}
                      </ElSelect>
                      <ElButton type="danger" onClick={() => removeProject(index)}>
                        <ElIcon><Delete /></ElIcon>
                      </ElButton>
                    </div>
                  ))}
                  <ElButton type="primary" onClick={addProject}>添加项目</ElButton>
                </>
              )
            }}
          </ElCard>

          <ElCard class="date-range">
            {{
              header: () => <h2>时间范围</h2>,
              default: () => (
                <ElDatePicker
                  v-model={dateRange.value}
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                />
              )
            }}
          </ElCard>

          <ElCard class="preview">
            {{
              header: () => <h2>预览</h2>,
              default: () => (
                <div class="markdown-preview" innerHTML={previewContent.value}></div>
              )
            }}
          </ElCard>
        </ElMain>

        <ElFooter>
          <ElButton type="primary" onClick={generateReport}>生成周报</ElButton>
          <ElButton onClick={saveConfig}>保存配置</ElButton>
        </ElFooter>
      </ElContainer>
    )
  }
}) 