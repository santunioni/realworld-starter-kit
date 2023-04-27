# API Gateway
resource "aws_api_gateway_rest_api" "api" {
  name                     = local.NAME
  description              = "API for ${local.NAME}"
  binary_media_types       = ["*/*"]
  minimum_compression_size = 0
  tags                     = local.COMMON_TAGS
}

locals {
  API_GATEWAY_DOMAIN = "https://${aws_api_gateway_rest_api.api.id}.execute-api.${data.aws_region.current}.amazonaws.com/"
}
