import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

interface MdImageProps {
  src?: string;
  alt?: string;
  title?: string;
}

/**
 * 文档图片组件，基于 react-medium-image-zoom：
 * - 点击放大（Medium 风格的灯箱效果）
 * - 懒加载
 * - 标题语法 ![alt](url "标题") 会渲染为图片下方的说明文字
 */
export function MdImage({ src, alt, title }: MdImageProps) {
  if (!src) return null;

  return (
    <span className="my-6 block text-center">
      <Zoom wrapElement="span" zoomMargin={24}>
        <img
          src={src}
          alt={alt ?? ''}
          title={title}
          loading="lazy"
          className="inline-block max-w-full rounded-xl border border-border shadow-lg"
        />
      </Zoom>
      {title && (
        <span className="mt-2 block text-sm text-muted-foreground">{title}</span>
      )}
    </span>
  );
}
