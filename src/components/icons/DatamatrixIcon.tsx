import * as React from "react"

interface DatamatrixIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

/**
 * Ícone de Datamatrix (código 2D em formato de matriz)
 * Representa visualmente um código Datamatrix real com padrão de pixels
 */
export const DatamatrixIcon: React.FC<DatamatrixIconProps> = ({
  size = 24,
  className = "",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Borda sólida esquerda (característica do Datamatrix) */}
      <rect x="2" y="2" width="1.5" height="20" />

      {/* Borda sólida inferior (característica do Datamatrix) */}
      <rect x="2" y="20.5" width="20" height="1.5" />

      {/* Borda superior alternada */}
      <rect x="2" y="2" width="1.5" height="1.5" />
      <rect x="5" y="2" width="1.5" height="1.5" />
      <rect x="8" y="2" width="1.5" height="1.5" />
      <rect x="11" y="2" width="1.5" height="1.5" />
      <rect x="14" y="2" width="1.5" height="1.5" />
      <rect x="17" y="2" width="1.5" height="1.5" />
      <rect x="20" y="2" width="1.5" height="1.5" />

      {/* Borda direita alternada */}
      <rect x="20.5" y="2" width="1.5" height="1.5" />
      <rect x="20.5" y="5" width="1.5" height="1.5" />
      <rect x="20.5" y="8" width="1.5" height="1.5" />
      <rect x="20.5" y="11" width="1.5" height="1.5" />
      <rect x="20.5" y="14" width="1.5" height="1.5" />
      <rect x="20.5" y="17" width="1.5" height="1.5" />
      <rect x="20.5" y="20" width="1.5" height="1.5" />

      {/* Padrão interno de dados - Linha 1 */}
      <rect x="5" y="5" width="1.5" height="1.5" />
      <rect x="8" y="5" width="1.5" height="1.5" />
      <rect x="14" y="5" width="1.5" height="1.5" />
      <rect x="17" y="5" width="1.5" height="1.5" />

      {/* Padrão interno de dados - Linha 2 */}
      <rect x="5" y="8" width="1.5" height="1.5" />
      <rect x="11" y="8" width="1.5" height="1.5" />
      <rect x="14" y="8" width="1.5" height="1.5" />
      <rect x="17" y="8" width="1.5" height="1.5" />

      {/* Padrão interno de dados - Linha 3 */}
      <rect x="8" y="11" width="1.5" height="1.5" />
      <rect x="11" y="11" width="1.5" height="1.5" />
      <rect x="17" y="11" width="1.5" height="1.5" />

      {/* Padrão interno de dados - Linha 4 */}
      <rect x="5" y="14" width="1.5" height="1.5" />
      <rect x="8" y="14" width="1.5" height="1.5" />
      <rect x="11" y="14" width="1.5" height="1.5" />
      <rect x="14" y="14" width="1.5" height="1.5" />
      <rect x="17" y="14" width="1.5" height="1.5" />

      {/* Padrão interno de dados - Linha 5 */}
      <rect x="5" y="17" width="1.5" height="1.5" />
      <rect x="11" y="17" width="1.5" height="1.5" />
      <rect x="14" y="17" width="1.5" height="1.5" />
    </svg>
  )
}

export default DatamatrixIcon

