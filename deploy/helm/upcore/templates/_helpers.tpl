{{/*
Common labels
*/}}
{{- define "upcore.labels" -}}
app.kubernetes.io/name: upcore-{{ .svcName }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: helm
app.kubernetes.io/part-of: upcore
app.kubernetes.io/version: {{ .Values.global.imageTag | quote }}
{{- end -}}

{{/*
Image path
*/}}
{{- define "upcore.image" -}}
{{ .Values.global.imageRegistry }}/upcore-{{ .svcName }}:{{ .Values.global.imageTag }}
{{- end -}}
