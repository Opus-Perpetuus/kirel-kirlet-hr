import { define_module, define_routes } from "@opus-perpetuus/kirel-nox-kit";
import { documents_pages } from "./documents.pages.ts";
import {
  delete_document,
  download_document,
  get_document,
  list_documents,
  upload_document,
} from "./documents.service.ts";
import { documents_tables } from "./documents.tables.ts";

const routes = define_routes({
  "GET /documents": list_documents,
  "POST /documents": upload_document,
  "GET /documents/:id": get_document,
  "DELETE /documents/:id": delete_document,
  "GET /documents/:id/download": download_document,
});

export const documents_module = define_module({
  resource: "documents",
  labels: {
    singular: "Documento",
    plural: "Documentos",
    read: "Ver documentos",
    write: "Editar documentos",
  },
  routes,
  tables: documents_tables,
  pages: documents_pages,
  menu: [
    {
      id: "hr.documents",
      label: "Documentos",
      order: 60,
      pageId: "hr.documents",
      path: "documents",
      permission: "kirlet.hr.documents.read",
      icon: "attachment",
    },
  ],
});
