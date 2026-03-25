import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import type { Paginated, PaginationParams } from '../types.js'

export interface Directory {
  id: string
  name: string
  type?: string
}

export interface SesameDocument {
  id: string
  name: string
}

export interface ListDocumentsParams extends PaginationParams {
  parentDirectoryId?: string
}

export interface UploadDocumentParams {
  directoryId: string
  file: Blob
  fileName: string
  name?: string
  originalDate?: string
  notifyEmployee?: boolean
}

/** Document management — browse directories, list/upload/download documents. */
export class DocumentsModule {
  constructor(
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /** Get directory details by ID. */
  async directory(directoryId: string): Promise<Directory> {
    return this.http.getData(`/api/v3/directories/${directoryId}`)
  }

  /** List documents visible to the authenticated employee (paginated). */
  async list(params?: ListDocumentsParams): Promise<Paginated<SesameDocument>> {
    return this.http.get('/api/v3/documents', {
      limit: params?.limit ?? 20,
      page: params?.page ?? 1,
      parentDirectoryId: params?.parentDirectoryId,
      viewerReferenceType: 'employee',
      viewerReferenceId: this.config.employeeId,
    })
  }

  /** Upload a document to a specific directory. */
  async upload(params: UploadDocumentParams): Promise<{ id: string }> {
    const formData = new FormData()
    formData.append('document', params.file, params.fileName)
    if (params.name) formData.append('name', params.name)
    if (params.originalDate) formData.append('originalDate', params.originalDate)
    if (params.notifyEmployee) formData.append('notifyEmployee', 'true')

    return this.http.upload(
      `/api/v3/directories/${params.directoryId}/documents`,
      formData,
    )
  }

  /** Get a temporary download URL for a document. */
  async downloadUrl(documentId: string): Promise<string> {
    const response = await this.http.get<{ data?: { url?: string }; url?: string }>(
      `/api/v3/documents/${documentId}/url`,
    )
    const url = response.data?.url ?? response.url
    if (typeof url !== 'string') throw new Error('Invalid download URL response')
    return url
  }
}
