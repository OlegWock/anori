import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { EmptyObject } from "@anori/utils/types";
import { memo } from "react";
import { css } from "styled-system/css";

const container = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "2",
  flexGrow: 1,
  alignSelf: "stretch",
  minWidth: 0,
});

const valuePreview = css({
  fontSize: "sm",
  color: "text.subtle",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const UserCellTestWidget = memo(function UserCellTestWidget(_props: WidgetRenderProps<EmptyObject>) {
  const [note, setNote] = useStorageValue(anoriSchema.testUserNote);

  return (
    <div className={container}>
      <Field label="User note">
        <Input value={note} onValueChange={setNote} placeholder="Synced across profiles" />
      </Field>
      <div className={valuePreview}>{note === "" ? "Empty" : note}</div>
    </div>
  );
});
