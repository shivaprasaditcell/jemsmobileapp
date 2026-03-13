export interface ContentNode {
  nodeId: number;
  nodeTitle: string;
  nodeDescription?: string;
  nodeTypeId: number;   // 1 = Unit, 2 = Chapter, 3 = Topic
  nodeTypeName: string;
  displayOrder: number;
  parentNodeId?: number;
  attachments?: ContentAttachment[];
  children: ContentNode[];
}

export interface ContentAttachment {
  attachmentId: number;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  fileUrl?: string;
}

export interface ContentTree {
  facultyId: number;
  subjectId: number;
  sessionId: number;
  nodes: ContentNode[];
  totalNodes: number;
}
