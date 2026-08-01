import { childElements, type XmlElementLike } from '../epub/xml';
import type { CfiDomElement } from './types';

export function getElementId(element: CfiDomElement): string | undefined {
  const withAttributes = element as CfiDomElement & {
    attributes?: {
      length: number;
      getNamedItem?: (name: string) => { value: string } | null;
      [index: number]: { name: string; value: string };
    };
  };

  if (withAttributes.attributes?.getNamedItem) {
    const named = withAttributes.attributes.getNamedItem('id');

    if (named?.value) {
      return named.value;
    }
  }

  if (withAttributes.attributes) {
    for (let index = 0; index < withAttributes.attributes.length; index += 1) {
      const attribute = withAttributes.attributes[index]!;

      if (attribute.name === 'id' || attribute.name.endsWith(':id')) {
        return attribute.value;
      }
    }
  }

  return (
    element.getAttribute?.('id') ??
    element.id ??
    undefined
  );
}

export function resolveSpineIndexFromPackageSteps(
  packageElement: XmlElementLike,
  steps: Array<{ index: number; assertion?: { id?: string } }>,
): number {
  const spineElement = childElements(packageElement, 'spine')[0];

  if (!spineElement) {
    throw new Error('Package document is missing spine element');
  }

  const itemrefs = childElements(spineElement, 'itemref');
  const itemrefStep = steps[1];

  if (itemrefStep?.assertion?.id) {
    const byId = itemrefs.findIndex(
      (itemref) => itemref.getAttribute('id') === itemrefStep.assertion!.id,
    );

    if (byId >= 0) {
      return byId;
    }
  }

  if (!itemrefStep) {
    throw new Error('CFI package path is missing spine itemref step');
  }

  const itemrefIndex = itemrefStep.index / 2 - 1;

  if (!Number.isInteger(itemrefIndex) || itemrefIndex < 0 || itemrefIndex >= itemrefs.length) {
    throw new Error(`CFI spine itemref step /${itemrefStep.index} is out of range`);
  }

  return itemrefIndex;
}

export function assertPackageSpineStep(
  packageElement: XmlElementLike,
  step: { index: number },
): void {
  const spineElement = childElements(packageElement, 'spine')[0];

  if (!spineElement) {
    throw new Error('Package document is missing spine element');
  }

  const elements = Array.from(packageElement.childNodes).filter((node) => node.nodeType === 1);
  const spinePosition = elements.indexOf(spineElement);

  if (spinePosition === -1) {
    throw new Error('Unable to locate spine element in package document');
  }

  const expectedIndex = (spinePosition + 1) * 2;

  if (step.index !== expectedIndex) {
    throw new Error(`Expected spine step /${expectedIndex}, got /${step.index}`);
  }
}
