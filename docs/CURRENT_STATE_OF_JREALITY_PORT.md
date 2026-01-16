# CURRENT STATE OF JREALITY PORT

This document lists Java classes under the jreality-2021 source roots and indicates whether a corresponding JS file exists in jsreality-2021.

## Java source roots scanned
- /Users/gunn/Software/workspace/jreality-2021/src-core
- /Users/gunn/Software/workspace/jreality-2021/src-plugin
- /Users/gunn/Software/workspace/jreality-2021/src-tool

## Mapping rule
- A Java class is considered "ported" if a JS file with the same basename exists anywhere under `src/` in jsreality-2021.
- This is a name-based heuristic for quick dependency verification; it does not guarantee full feature parity.

## Known deviations from 1:1 porting
- **DataList simplification**: JS `DataList` is a simplified abstraction. It supports a single `fromDataList()` conversion to JS arrays and does not carry the Java `DataList` subtype hierarchy (`IntArrayArray`, `DoubleArrayArray`, etc.). Those Java classes are therefore intentionally absent and should not be treated as missing ports.
- **Factory hierarchy simplification**: Abstract factory layers such as `AbstractPointSetFactory`, `AbstractIndexedLineSetFactory`, and `AbstractIndexedFaceSetFactory` were removed in JS; their behavior was merged into concrete factory classes (e.g., `PointSetFactory`, `IndexedLineSetFactory`, `IndexedFaceSetFactory`, `QuadMeshFactory`).

## /Users/gunn/Software/workspace/jreality-2021/src-core

| Java class | Java path | JS path(s) | Status |
| --- | --- | --- | --- |
| AbstractGeometryFactory | `de/jreality/geometry/AbstractGeometryFactory.java` |  | missing |
| AbstractIndexedFaceSetFactory | `de/jreality/geometry/AbstractIndexedFaceSetFactory.java` |  | missing |
| AbstractIndexedLineSetFactory | `de/jreality/geometry/AbstractIndexedLineSetFactory.java` |  | missing |
| AbstractPointSetFactory | `de/jreality/geometry/AbstractPointSetFactory.java` |  | missing |
| AbstractQuadMeshFactory | `de/jreality/geometry/AbstractQuadMeshFactory.java` |  | missing |
| BallAndStickFactory | `de/jreality/geometry/BallAndStickFactory.java` | `core/geometry/BallAndStickFactory.js` | present |
| BezierPatchMesh | `de/jreality/geometry/BezierPatchMesh.java` |  | missing |
| BoundingBoxTraversal | `de/jreality/geometry/BoundingBoxTraversal.java` | `core/geometry/BoundingBoxTraversal.js` | present |
| BoundingBoxUtility | `de/jreality/geometry/BoundingBoxUtility.java` | `core/geometry/BoundingBoxUtility.js` | present |
| CoordinateSystemBeautifier | `de/jreality/geometry/CoordinateSystemBeautifier.java` |  | missing |
| CoordinateSystemFactory | `de/jreality/geometry/CoordinateSystemFactory.java` |  | missing |
| FatIndexedFaceSetFactory | `de/jreality/geometry/FatIndexedFaceSetFactory.java` |  | missing |
| FrameFieldType | `de/jreality/geometry/FrameFieldType.java` |  | missing |
| GeometryAttributeListSet | `de/jreality/geometry/GeometryAttributeListSet.java` |  | missing |
| GeometryFactory | `de/jreality/geometry/GeometryFactory.java` |  | missing |
| GeometryMergeFactory | `de/jreality/geometry/GeometryMergeFactory.java` |  | missing |
| GeometryUtility | `de/jreality/geometry/GeometryUtility.java` | `core/geometry/GeometryUtility.js` | present |
| HeightFieldFactory | `de/jreality/geometry/HeightFieldFactory.java` |  | missing |
| IndexedFaceSetFactory | `de/jreality/geometry/IndexedFaceSetFactory.java` | `core/geometry/IndexedFaceSetFactory.js` | present |
| IndexedFaceSetUtility | `de/jreality/geometry/IndexedFaceSetUtility.java` | `core/geometry/IndexedFaceSetUtility.js` | present |
| IndexedLineSetFactory | `de/jreality/geometry/IndexedLineSetFactory.java` | `core/geometry/IndexedLineSetFactory.js` | present |
| IndexedLineSetUtility | `de/jreality/geometry/IndexedLineSetUtility.java` | `core/geometry/IndexedLineSetUtility.js` | present |
| OoNode | `de/jreality/geometry/OoNode.java` |  | missing |
| ParametricSurfaceFactory | `de/jreality/geometry/ParametricSurfaceFactory.java` | `core/geometry/ParametricSurfaceFactory.js` | present |
| ParametricTriangularSurfaceFactory | `de/jreality/geometry/ParametricTriangularSurfaceFactory.java` |  | missing |
| PointSetFactory | `de/jreality/geometry/PointSetFactory.java` | `core/geometry/PointSetFactory.js` | present |
| PointSetUtility | `de/jreality/geometry/PointSetUtility.java` |  | missing |
| PolygonalTubeFactory | `de/jreality/geometry/PolygonalTubeFactory.java` | `core/geometry/PolygonalTubeFactory.js` | present |
| Primitives | `de/jreality/geometry/Primitives.java` | `core/geometry/Primitives.js` | present |
| QuadMeshFactory | `de/jreality/geometry/QuadMeshFactory.java` | `core/geometry/QuadMeshFactory.js` | present |
| QuadMeshUtility | `de/jreality/geometry/QuadMeshUtility.java` |  | missing |
| RemoveDuplicateInfo | `de/jreality/geometry/RemoveDuplicateInfo.java` |  | missing |
| SliceBoxFactory | `de/jreality/geometry/SliceBoxFactory.java` |  | missing |
| SphereUtility | `de/jreality/geometry/SphereUtility.java` | `core/geometry/SphereUtility.js` | present |
| ThickenedSurfaceFactory | `de/jreality/geometry/ThickenedSurfaceFactory.java` |  | missing |
| TubeFactory | `de/jreality/geometry/TubeFactory.java` | `core/geometry/TubeFactory.js` | present |
| TubeFactoryBroken | `de/jreality/geometry/TubeFactoryBroken.java` |  | missing |
| TubeUtility | `de/jreality/geometry/TubeUtility.java` | `core/geometry/TubeUtility.js` | present |
| CubicBSpline | `de/jreality/math/CubicBSpline.java` |  | missing |
| FactoredMatrix | `de/jreality/math/FactoredMatrix.java` | `core/math/FactoredMatrix.js` | present |
| Matrix | `de/jreality/math/Matrix.java` | `core/math/Matrix.js` | present |
| MatrixBuilder | `de/jreality/math/MatrixBuilder.java` | `core/math/MatrixBuilder.js` | present |
| P2 | `de/jreality/math/P2.java` | `core/math/P2.js` | present |
| P3 | `de/jreality/math/P3.java` | `core/math/P3.js` | present |
| Pn | `de/jreality/math/Pn.java` | `core/math/Pn.js` | present |
| Quat | `de/jreality/math/Quat.java` |  | missing |
| Quaternion | `de/jreality/math/Quaternion.java` | `core/math/Quaternion.js` | present |
| Rn | `de/jreality/math/Rn.java` | `core/math/Rn.js` | present |
| Appearance | `de/jreality/scene/Appearance.java` | `core/scene/Appearance.js` | present |
| AudioSource | `de/jreality/scene/AudioSource.java` |  | missing |
| Camera | `de/jreality/scene/Camera.java` | `core/scene/Camera.js` | present |
| ClippingPlane | `de/jreality/scene/ClippingPlane.java` | `core/scene/ClippingPlane.js` | present |
| Cylinder | `de/jreality/scene/Cylinder.java` | `core/scene/Cylinder.js` | present |
| Attribute | `de/jreality/scene/data/Attribute.java` |  | missing |
| AttributeCollection | `de/jreality/scene/data/AttributeCollection.java` |  | missing |
| AttributeEntity | `de/jreality/scene/data/AttributeEntity.java` |  | missing |
| AttributeEntityUtility | `de/jreality/scene/data/AttributeEntityUtility.java` |  | missing |
| ByteBufferList | `de/jreality/scene/data/ByteBufferList.java` |  | missing |
| ByteBufferListSet | `de/jreality/scene/data/ByteBufferListSet.java` |  | missing |
| ByteBufferStorage | `de/jreality/scene/data/ByteBufferStorage.java` |  | missing |
| DataItem | `de/jreality/scene/data/DataItem.java` |  | missing |
| DataList | `de/jreality/scene/data/DataList.java` | `core/scene/data/DataList.js` | present |
| DataListSet | `de/jreality/scene/data/DataListSet.java` |  | missing |
| DoubleArray | `de/jreality/scene/data/DoubleArray.java` |  | missing |
| DoubleArrayArray | `de/jreality/scene/data/DoubleArrayArray.java` |  | missing |
| DoubleArrayStorage | `de/jreality/scene/data/DoubleArrayStorage.java` |  | missing |
| IntArray | `de/jreality/scene/data/IntArray.java` |  | missing |
| IntArrayArray | `de/jreality/scene/data/IntArrayArray.java` |  | missing |
| IntArrayStorage | `de/jreality/scene/data/IntArrayStorage.java` |  | missing |
| SampleReader | `de/jreality/scene/data/SampleReader.java` |  | missing |
| StorageModel | `de/jreality/scene/data/StorageModel.java` |  | missing |
| StringArray | `de/jreality/scene/data/StringArray.java` |  | missing |
| StringArrayArray | `de/jreality/scene/data/StringArrayArray.java` |  | missing |
| StringArrayStorage | `de/jreality/scene/data/StringArrayStorage.java` |  | missing |
| WritableDataList | `de/jreality/scene/data/WritableDataList.java` |  | missing |
| DirectionalLight | `de/jreality/scene/DirectionalLight.java` |  | missing |
| AppearanceEvent | `de/jreality/scene/event/AppearanceEvent.java` |  | missing |
| AppearanceEventMulticaster | `de/jreality/scene/event/AppearanceEventMulticaster.java` |  | missing |
| AppearanceListener | `de/jreality/scene/event/AppearanceListener.java` |  | missing |
| AudioEvent | `de/jreality/scene/event/AudioEvent.java` |  | missing |
| AudioEventMulticaster | `de/jreality/scene/event/AudioEventMulticaster.java` |  | missing |
| AudioListener | `de/jreality/scene/event/AudioListener.java` |  | missing |
| CameraEvent | `de/jreality/scene/event/CameraEvent.java` |  | missing |
| CameraEventMulticaster | `de/jreality/scene/event/CameraEventMulticaster.java` |  | missing |
| CameraListener | `de/jreality/scene/event/CameraListener.java` |  | missing |
| GeometryEvent | `de/jreality/scene/event/GeometryEvent.java` |  | missing |
| GeometryEventMulticaster | `de/jreality/scene/event/GeometryEventMulticaster.java` |  | missing |
| GeometryListener | `de/jreality/scene/event/GeometryListener.java` |  | missing |
| LightEvent | `de/jreality/scene/event/LightEvent.java` |  | missing |
| LightEventMulticaster | `de/jreality/scene/event/LightEventMulticaster.java` |  | missing |
| LightListener | `de/jreality/scene/event/LightListener.java` |  | missing |
| SceneEvent | `de/jreality/scene/event/SceneEvent.java` |  | missing |
| SceneGraphComponentEvent | `de/jreality/scene/event/SceneGraphComponentEvent.java` |  | missing |
| SceneGraphComponentEventMulticaster | `de/jreality/scene/event/SceneGraphComponentEventMulticaster.java` |  | missing |
| SceneGraphComponentListener | `de/jreality/scene/event/SceneGraphComponentListener.java` |  | missing |
| ToolEvent | `de/jreality/scene/event/ToolEvent.java` | `core/scene/tool/ToolEvent.js` | present |
| ToolEventMulticaster | `de/jreality/scene/event/ToolEventMulticaster.java` |  | missing |
| ToolListener | `de/jreality/scene/event/ToolListener.java` |  | missing |
| TransformationEvent | `de/jreality/scene/event/TransformationEvent.java` |  | missing |
| TransformationEventMulticaster | `de/jreality/scene/event/TransformationEventMulticaster.java` |  | missing |
| TransformationListener | `de/jreality/scene/event/TransformationListener.java` |  | missing |
| Geometry | `de/jreality/scene/Geometry.java` | `core/scene/Geometry.js` | present |
| IndexedFaceSet | `de/jreality/scene/IndexedFaceSet.java` | `core/scene/IndexedFaceSet.js` | present |
| IndexedLineSet | `de/jreality/scene/IndexedLineSet.java` | `core/scene/IndexedLineSet.js` | present |
| Light | `de/jreality/scene/Light.java` |  | missing |
| Lock | `de/jreality/scene/Lock.java` |  | missing |
| NewLock | `de/jreality/scene/NewLock.java` |  | missing |
| OldLock | `de/jreality/scene/OldLock.java` |  | missing |
| AABB | `de/jreality/scene/pick/AABB.java` | `core/scene/pick/AABB.js` | present |
| AABBPickSystem | `de/jreality/scene/pick/AABBPickSystem.java` | `core/scene/pick/AABBPickSystem.js` | present |
| AABBTree | `de/jreality/scene/pick/AABBTree.java` | `core/scene/pick/AABBTree.js` | present |
| BruteForcePicking | `de/jreality/scene/pick/BruteForcePicking.java` | `core/scene/pick/BruteForcePicking.js` | present |
| Graphics3D | `de/jreality/scene/pick/Graphics3D.java` | `core/scene/pick/Graphics3D.js` | present |
| Hit | `de/jreality/scene/pick/Hit.java` | `core/scene/pick/Hit.js` | present |
| HitFilter | `de/jreality/scene/pick/HitFilter.java` | `core/scene/pick/HitFilter.js` | present |
| PickResult | `de/jreality/scene/pick/PickResult.java` | `core/scene/pick/PickResult.js` | present |
| PickSystem | `de/jreality/scene/pick/PickSystem.java` | `core/scene/pick/PickSystem.js` | present |
| PosWHitFilter | `de/jreality/scene/pick/PosWHitFilter.java` | `core/scene/pick/PosWHitFilter.js` | present |
| PointLight | `de/jreality/scene/PointLight.java` |  | missing |
| PointSet | `de/jreality/scene/PointSet.java` | `core/scene/PointSet.js` | present |
| ProxyFactory | `de/jreality/scene/proxy/ProxyFactory.java` |  | missing |
| SceneProxyBuilder | `de/jreality/scene/proxy/SceneProxyBuilder.java` |  | missing |
| EntityFactory | `de/jreality/scene/proxy/tree/EntityFactory.java` |  | missing |
| ProxyConnector | `de/jreality/scene/proxy/tree/ProxyConnector.java` |  | missing |
| ProxyTreeFactory | `de/jreality/scene/proxy/tree/ProxyTreeFactory.java` |  | missing |
| SceneGraphNodeEntity | `de/jreality/scene/proxy/tree/SceneGraphNodeEntity.java` |  | missing |
| SceneProxyTreeBuilder | `de/jreality/scene/proxy/tree/SceneProxyTreeBuilder.java` |  | missing |
| SceneTreeNode | `de/jreality/scene/proxy/tree/SceneTreeNode.java` |  | missing |
| UpToDateSceneProxyBuilder | `de/jreality/scene/proxy/tree/UpToDateSceneProxyBuilder.java` |  | missing |
| Scene | `de/jreality/scene/Scene.java` |  | missing |
| SceneGraphComponent | `de/jreality/scene/SceneGraphComponent.java` | `core/scene/SceneGraphComponent.js` | present |
| SceneGraphLoopException | `de/jreality/scene/SceneGraphLoopException.java` |  | missing |
| SceneGraphNode | `de/jreality/scene/SceneGraphNode.java` | `core/scene/SceneGraphNode.js` | present |
| SceneGraphPath | `de/jreality/scene/SceneGraphPath.java` | `core/scene/SceneGraphPath.js` | present |
| SceneGraphPathObserver | `de/jreality/scene/SceneGraphPathObserver.java` |  | missing |
| SceneGraphVisitor | `de/jreality/scene/SceneGraphVisitor.java` | `core/scene/SceneGraphVisitor.js` | present |
| Sphere | `de/jreality/scene/Sphere.java` | `core/scene/Sphere.js` | present |
| SpotLight | `de/jreality/scene/SpotLight.java` |  | missing |
| StereoViewer | `de/jreality/scene/StereoViewer.java` |  | missing |
| AbstractTool | `de/jreality/scene/tool/AbstractTool.java` | `core/scene/tool/AbstractTool.js` | present |
| AxisState | `de/jreality/scene/tool/AxisState.java` | `core/scene/tool/AxisState.js` | present |
| BeanShellTool | `de/jreality/scene/tool/BeanShellTool.java` |  | missing |
| InputSlot | `de/jreality/scene/tool/InputSlot.java` | `core/scene/tool/InputSlot.js` | present |
| Tool | `de/jreality/scene/tool/Tool.java` | `core/scene/tool/Tool.js` | present |
| ToolContext | `de/jreality/scene/tool/ToolContext.java` | `core/scene/tool/ToolContext.js` | present |
| Transformation | `de/jreality/scene/Transformation.java` | `core/scene/Transformation.js` | present |
| Viewer | `de/jreality/scene/Viewer.java` | `core/scene/Viewer.js` | present |
| CommonAttributes | `de/jreality/shader/CommonAttributes.java` | `core/shader/CommonAttributes.js` | present |
| CubeMap | `de/jreality/shader/CubeMap.java` |  | missing |
| DefaultGeometryShader | `de/jreality/shader/DefaultGeometryShader.java` | `core/shader/DefaultGeometryShader.js` | present |
| DefaultLineShader | `de/jreality/shader/DefaultLineShader.java` | `core/shader/DefaultLineShader.js` | present |
| DefaultPointShader | `de/jreality/shader/DefaultPointShader.java` | `core/shader/DefaultPointShader.js` | present |
| DefaultPolygonShader | `de/jreality/shader/DefaultPolygonShader.java` | `core/shader/DefaultPolygonShader.js` | present |
| DefaultTextShader | `de/jreality/shader/DefaultTextShader.java` |  | missing |
| EffectiveAppearance | `de/jreality/shader/EffectiveAppearance.java` | `core/shader/EffectiveAppearance.js` | present |
| GlslProgram | `de/jreality/shader/GlslProgram.java` |  | missing |
| GlslSource | `de/jreality/shader/GlslSource.java` |  | missing |
| HapticShader | `de/jreality/shader/HapticShader.java` |  | missing |
| ImageData | `de/jreality/shader/ImageData.java` |  | missing |
| ImplodePolygonShader | `de/jreality/shader/ImplodePolygonShader.java` | `core/shader/ImplodePolygonShader.js` | present |
| LineShader | `de/jreality/shader/LineShader.java` | `core/shader/LineShader.js` | present |
| PointShader | `de/jreality/shader/PointShader.java` | `core/shader/PointShader.js` | present |
| PolygonShader | `de/jreality/shader/PolygonShader.java` | `core/shader/PolygonShader.js` | present |
| RenderingHintsShader | `de/jreality/shader/RenderingHintsShader.java` | `core/shader/RenderingHintsShader.js` | present |
| RootAppearance | `de/jreality/shader/RootAppearance.java` | `core/shader/RootAppearance.js` | present |
| ShaderUtility | `de/jreality/shader/ShaderUtility.java` | `core/shader/ShaderUtility.js` | present |
| TextShader | `de/jreality/shader/TextShader.java` |  | missing |
| Texture2D | `de/jreality/shader/Texture2D.java` |  | missing |
| TextureUtility | `de/jreality/shader/TextureUtility.java` |  | missing |
| TwoSidePolygonShader | `de/jreality/shader/TwoSidePolygonShader.java` |  | missing |
| ArrayUtility | `de/jreality/util/ArrayUtility.java` |  | missing |
| CameraUtility | `de/jreality/util/CameraUtility.java` | `core/util/CameraUtility.js` | present |
| ClippingPlaneCollector | `de/jreality/util/ClippingPlaneCollector.java` |  | missing |
| ColorGradient | `de/jreality/util/ColorGradient.java` | `core/util/ColorGradient.js` | present |
| ConfigurationAttributes | `de/jreality/util/ConfigurationAttributes.java` |  | missing |
| CopyVisitor | `de/jreality/util/CopyVisitor.java` |  | missing |
| DefaultMatrixSupport | `de/jreality/util/DefaultMatrixSupport.java` |  | missing |
| EncompassFactory | `de/jreality/util/EncompassFactory.java` |  | missing |
| GuiUtility | `de/jreality/util/GuiUtility.java` |  | missing |
| ImageUtility | `de/jreality/util/ImageUtility.java` |  | missing |
| Input | `de/jreality/util/Input.java` |  | missing |
| LightCollector | `de/jreality/util/LightCollector.java` |  | missing |
| LoggingSystem | `de/jreality/util/LoggingSystem.java` | `core/util/LoggingSystem.js` | present |
| NativePathUtility | `de/jreality/util/NativePathUtility.java` |  | missing |
| PathCollector | `de/jreality/util/PathCollector.java` |  | missing |
| PickUtility | `de/jreality/util/PickUtility.java` | `core/scene/pick/PickUtility.js`<br>`core/util/PickUtility.js` | present |
| Rectangle3D | `de/jreality/util/Rectangle3D.java` | `core/util/Rectangle3D.js` | present |
| RenderTrigger | `de/jreality/util/RenderTrigger.java` |  | missing |
| SceneGraphUtility | `de/jreality/util/SceneGraphUtility.java` | `core/util/SceneGraphUtility.js` | present |
| Secure | `de/jreality/util/Secure.java` |  | missing |
| SystemProperties | `de/jreality/util/SystemProperties.java` |  | missing |
| TargaFile | `de/jreality/util/TargaFile.java` |  | missing |

## /Users/gunn/Software/workspace/jreality-2021/src-plugin

| Java class | Java path | JS path(s) | Status |
| --- | --- | --- | --- |
| Audio | `de/jreality/plugin/audio/Audio.java` |  | missing |
| AudioOptions | `de/jreality/plugin/audio/AudioOptions.java` |  | missing |
| AudioPreferences | `de/jreality/plugin/audio/AudioPreferences.java` |  | missing |
| ConsolePlugin | `de/jreality/plugin/basic/ConsolePlugin.java` |  | missing |
| Content | `de/jreality/plugin/basic/Content.java` |  | missing |
| InfoOverlayPlugin | `de/jreality/plugin/basic/InfoOverlayPlugin.java` |  | missing |
| Inspector | `de/jreality/plugin/basic/Inspector.java` |  | missing |
| MainPanel | `de/jreality/plugin/basic/MainPanel.java` |  | missing |
| PropertiesMenu | `de/jreality/plugin/basic/PropertiesMenu.java` |  | missing |
| PropertyPreferences | `de/jreality/plugin/basic/PropertyPreferences.java` |  | missing |
| RunningEnvironment | `de/jreality/plugin/basic/RunningEnvironment.java` |  | missing |
| Scene | `de/jreality/plugin/basic/Scene.java` |  | missing |
| Shell | `de/jreality/plugin/basic/Shell.java` |  | missing |
| SimpleAppearancePlugin | `de/jreality/plugin/basic/SimpleAppearancePlugin.java` |  | missing |
| StatusBar | `de/jreality/plugin/basic/StatusBar.java` |  | missing |
| ToolSystemPlugin | `de/jreality/plugin/basic/ToolSystemPlugin.java` |  | missing |
| View | `de/jreality/plugin/basic/View.java` |  | missing |
| ViewMenuBar | `de/jreality/plugin/basic/ViewMenuBar.java` |  | missing |
| ViewPreferences | `de/jreality/plugin/basic/ViewPreferences.java` |  | missing |
| ViewShrinkPanelPlugin | `de/jreality/plugin/basic/ViewShrinkPanelPlugin.java` |  | missing |
| ViewToolBar | `de/jreality/plugin/basic/ViewToolBar.java` |  | missing |
| CenteredAndScaledContent | `de/jreality/plugin/content/CenteredAndScaledContent.java` |  | missing |
| ContentAppearance | `de/jreality/plugin/content/ContentAppearance.java` |  | missing |
| ContentLoader | `de/jreality/plugin/content/ContentLoader.java` |  | missing |
| ContentTools | `de/jreality/plugin/content/ContentTools.java` |  | missing |
| DirectContent | `de/jreality/plugin/content/DirectContent.java` |  | missing |
| TerrainAlignedContent | `de/jreality/plugin/content/TerrainAlignedContent.java` |  | missing |
| JRPluginManager | `de/jreality/plugin/experimental/JRPluginManager.java` |  | missing |
| LoadSaveSettings | `de/jreality/plugin/experimental/LoadSaveSettings.java` |  | missing |
| ManagedContent | `de/jreality/plugin/experimental/ManagedContent.java` |  | missing |
| ManagedContentGUI | `de/jreality/plugin/experimental/ManagedContentGUI.java` |  | missing |
| ViewerKeyListener | `de/jreality/plugin/experimental/ViewerKeyListener.java` |  | missing |
| ViewerKeyListenerPlugin | `de/jreality/plugin/experimental/ViewerKeyListenerPlugin.java` |  | missing |
| WebContentLoader | `de/jreality/plugin/experimental/WebContentLoader.java` |  | missing |
| ParametricSurfaceFactoryPlugin | `de/jreality/plugin/geometry/ParametricSurfaceFactoryPlugin.java` |  | missing |
| ImageHook | `de/jreality/plugin/icon/ImageHook.java` |  | missing |
| AbstractCancelableJob | `de/jreality/plugin/job/AbstractCancelableJob.java` |  | missing |
| AbstractJob | `de/jreality/plugin/job/AbstractJob.java` |  | missing |
| BlockerJob | `de/jreality/plugin/job/BlockerJob.java` |  | missing |
| CancelableJob | `de/jreality/plugin/job/CancelableJob.java` |  | missing |
| Job | `de/jreality/plugin/job/Job.java` |  | missing |
| JobListener | `de/jreality/plugin/job/JobListener.java` |  | missing |
| JobMonitorPlugin | `de/jreality/plugin/job/JobMonitorPlugin.java` |  | missing |
| JobMonitorTooBar | `de/jreality/plugin/job/JobMonitorTooBar.java` |  | missing |
| JobProcessorListener | `de/jreality/plugin/job/JobProcessorListener.java` |  | missing |
| JobProcessorThread | `de/jreality/plugin/job/JobProcessorThread.java` |  | missing |
| JobQueuePlugin | `de/jreality/plugin/job/JobQueuePlugin.java` |  | missing |
| JobsTestPlugin | `de/jreality/plugin/job/JobsTestPlugin.java` |  | missing |
| ParallelJob | `de/jreality/plugin/job/ParallelJob.java` |  | missing |
| JRViewer | `de/jreality/plugin/JRViewer.java` |  | missing |
| JRViewerUtility | `de/jreality/plugin/JRViewerUtility.java` |  | missing |
| BackgroundColor | `de/jreality/plugin/menu/BackgroundColor.java` |  | missing |
| CameraMenu | `de/jreality/plugin/menu/CameraMenu.java` |  | missing |
| DisplayOptions | `de/jreality/plugin/menu/DisplayOptions.java` |  | missing |
| ExportMenu | `de/jreality/plugin/menu/ExportMenu.java` |  | missing |
| Avatar | `de/jreality/plugin/scene/Avatar.java` |  | missing |
| Lights | `de/jreality/plugin/scene/Lights.java` |  | missing |
| MirrorAppearance | `de/jreality/plugin/scene/MirrorAppearance.java` |  | missing |
| SceneShrinkPanel | `de/jreality/plugin/scene/SceneShrinkPanel.java` |  | missing |
| SceneShrinkSlot | `de/jreality/plugin/scene/SceneShrinkSlot.java` |  | missing |
| ShrinkPanelAggregator | `de/jreality/plugin/scene/ShrinkPanelAggregator.java` | `app/plugins/ShrinkPanelAggregator.js` | present |
| ShrinkPanelPluginCollector | `de/jreality/plugin/scene/ShrinkPanelPluginCollector.java` |  | missing |
| Sky | `de/jreality/plugin/scene/Sky.java` |  | missing |
| Terrain | `de/jreality/plugin/scene/Terrain.java` |  | missing |
| VRExamples | `de/jreality/plugin/scene/VRExamples.java` |  | missing |
| VRPanel | `de/jreality/plugin/scene/VRPanel.java` |  | missing |
| WindowManager | `de/jreality/plugin/scene/WindowManager.java` |  | missing |
| AbstractPythonGUI | `de/jreality/plugin/scripting/AbstractPythonGUI.java` |  | missing |
| NumberSpinnerGUI | `de/jreality/plugin/scripting/gui/NumberSpinnerGUI.java` |  | missing |
| PythonConsole | `de/jreality/plugin/scripting/PythonConsole.java` |  | missing |
| PythonGUI | `de/jreality/plugin/scripting/PythonGUI.java` |  | missing |
| PythonGUIListener | `de/jreality/plugin/scripting/PythonGUIListener.java` |  | missing |
| PythonGUIManager | `de/jreality/plugin/scripting/PythonGUIManager.java` |  | missing |
| PythonGUIPlugin | `de/jreality/plugin/scripting/PythonGUIPlugin.java` |  | missing |
| PythonGUIShrinker | `de/jreality/plugin/scripting/PythonGUIShrinker.java` |  | missing |
| PythonIOController | `de/jreality/plugin/scripting/PythonIOController.java` |  | missing |
| PythonScriptTool | `de/jreality/plugin/scripting/PythonScriptTool.java` |  | missing |
| PythonToolsManager | `de/jreality/plugin/scripting/PythonToolsManager.java` |  | missing |
| ButtonCellEditor | `de/jreality/plugin/scripting/swing/ButtonCellEditor.java` |  | missing |
| ButtonCellRenderer | `de/jreality/plugin/scripting/swing/ButtonCellRenderer.java` |  | missing |
| AppearanceInspector | `de/jreality/ui/AppearanceInspector.java` |  | missing |
| AppearanceInspectorState | `de/jreality/ui/AppearanceInspectorState.java` |  | missing |
| ColorChooseJButton | `de/jreality/ui/ColorChooseJButton.java` |  | missing |
| JRealitySplashScreen | `de/jreality/ui/JRealitySplashScreen.java` |  | missing |
| JSliderVR | `de/jreality/ui/JSliderVR.java` |  | missing |
| LabelsInspector | `de/jreality/ui/LabelsInspector.java` |  | missing |
| LayoutFactory | `de/jreality/ui/LayoutFactory.java` |  | missing |
| SimpleAppearanceInspector | `de/jreality/ui/SimpleAppearanceInspector.java` |  | missing |
| TextureInspector | `de/jreality/ui/TextureInspector.java` |  | missing |
| TextureJButton | `de/jreality/ui/TextureJButton.java` |  | missing |

## /Users/gunn/Software/workspace/jreality-2021/src-tool

| Java class | Java path | JS path(s) | Status |
| --- | --- | --- | --- |
| SMSLib | `de/jreality/macosx/sms/SMSLib.java` |  | missing |
| ActionTool | `de/jreality/tools/ActionTool.java` |  | missing |
| AirplaneTool | `de/jreality/tools/AirplaneTool.java` |  | missing |
| AnimatedRotateTool | `de/jreality/tools/AnimatedRotateTool.java` |  | missing |
| AnimatorTask | `de/jreality/tools/AnimatorTask.java` |  | missing |
| AnimatorTool | `de/jreality/tools/AnimatorTool.java` |  | missing |
| AxisTranslationTool | `de/jreality/tools/AxisTranslationTool.java` |  | missing |
| Button | `de/jreality/tools/Button.java` |  | missing |
| ClickWheelCameraZoomTool | `de/jreality/tools/ClickWheelCameraZoomTool.java` |  | missing |
| DampedDraggingTool | `de/jreality/tools/DampedDraggingTool.java` |  | missing |
| DragEventTool | `de/jreality/tools/DragEventTool.java` |  | missing |
| DraggingTool | `de/jreality/tools/DraggingTool.java` | `core/tools/DraggingTool.js` | present |
| DuplicateTriplyPeriodicTool | `de/jreality/tools/DuplicateTriplyPeriodicTool.java` |  | missing |
| EncompassTool | `de/jreality/tools/EncompassTool.java` |  | missing |
| FaceDragEvent | `de/jreality/tools/FaceDragEvent.java` |  | missing |
| FaceDragEventMulticaster | `de/jreality/tools/FaceDragEventMulticaster.java` |  | missing |
| FaceDragListener | `de/jreality/tools/FaceDragListener.java` |  | missing |
| FlyTool | `de/jreality/tools/FlyTool.java` |  | missing |
| FlyToPickTool | `de/jreality/tools/FlyToPickTool.java` |  | missing |
| HeadTransformationTool | `de/jreality/tools/HeadTransformationTool.java` |  | missing |
| LineDragEvent | `de/jreality/tools/LineDragEvent.java` |  | missing |
| LineDragEventMulticaster | `de/jreality/tools/LineDragEventMulticaster.java` |  | missing |
| LineDragListener | `de/jreality/tools/LineDragListener.java` |  | missing |
| LookAtTool | `de/jreality/tools/LookAtTool.java` |  | missing |
| PickShowTool | `de/jreality/tools/PickShowTool.java` |  | missing |
| PointDragEvent | `de/jreality/tools/PointDragEvent.java` |  | missing |
| PointDragEventMulticaster | `de/jreality/tools/PointDragEventMulticaster.java` |  | missing |
| PointDragListener | `de/jreality/tools/PointDragListener.java` |  | missing |
| PointerDisplayTool | `de/jreality/tools/PointerDisplayTool.java` |  | missing |
| PrimitiveDragEvent | `de/jreality/tools/PrimitiveDragEvent.java` |  | missing |
| PrimitiveDragEventMulticaster | `de/jreality/tools/PrimitiveDragEventMulticaster.java` |  | missing |
| PrimitiveDragListener | `de/jreality/tools/PrimitiveDragListener.java` |  | missing |
| RotateTool | `de/jreality/tools/RotateTool.java` | `core/tools/RotateTool.js` | present |
| ScaleTool | `de/jreality/tools/ScaleTool.java` |  | missing |
| ShipNavigationTool | `de/jreality/tools/ShipNavigationTool.java` |  | missing |
| ShipRotateTool | `de/jreality/tools/ShipRotateTool.java` |  | missing |
| ShipScaleTool | `de/jreality/tools/ShipScaleTool.java` |  | missing |
| ShowPropertiesTool | `de/jreality/tools/ShowPropertiesTool.java` |  | missing |
| ShowPropertiesToolLogger | `de/jreality/tools/ShowPropertiesToolLogger.java` |  | missing |
| SimpleDraggingTool | `de/jreality/tools/SimpleDraggingTool.java` |  | missing |
| SimpleRotateTool | `de/jreality/tools/SimpleRotateTool.java` |  | missing |
| Timer | `de/jreality/tools/Timer.java` |  | missing |
| TimerQueue | `de/jreality/tools/TimerQueue.java` |  | missing |
| TrackballRotateTool | `de/jreality/tools/TrackballRotateTool.java` |  | missing |
| TranslateTool | `de/jreality/tools/TranslateTool.java` | `core/tools/TranslateTool.js` | present |
| RawDeviceConfig | `de/jreality/toolsystem/config/RawDeviceConfig.java` |  | missing |
| RawMapping | `de/jreality/toolsystem/config/RawMapping.java` |  | missing |
| ToolSystemConfiguration | `de/jreality/toolsystem/config/ToolSystemConfiguration.java` | `core/scene/tool/ToolSystemConfiguration.js` | present |
| VirtualConstant | `de/jreality/toolsystem/config/VirtualConstant.java` |  | missing |
| VirtualDeviceConfig | `de/jreality/toolsystem/config/VirtualDeviceConfig.java` |  | missing |
| VirtualMapping | `de/jreality/toolsystem/config/VirtualMapping.java` |  | missing |
| DeviceManager | `de/jreality/toolsystem/DeviceManager.java` | `core/scene/tool/DeviceManager.js` | present |
| MissingSlotException | `de/jreality/toolsystem/MissingSlotException.java` | `core/scene/tool/MissingSlotException.js` | present |
| Poller | `de/jreality/toolsystem/Poller.java` | `core/scene/tool/Poller.js` | present |
| AbstractDeviceMouse | `de/jreality/toolsystem/raw/AbstractDeviceMouse.java` | `core/scene/tool/raw/AbstractDeviceMouse.js` | present |
| Device3DConnexionHID | `de/jreality/toolsystem/raw/Device3DConnexionHID.java` |  | missing |
| DeviceKeyboard | `de/jreality/toolsystem/raw/DeviceKeyboard.java` | `core/scene/tool/raw/DeviceKeyboard.js` | present |
| DeviceMacbookSuddenMotionSensor | `de/jreality/toolsystem/raw/DeviceMacbookSuddenMotionSensor.java` |  | missing |
| DeviceMouse | `de/jreality/toolsystem/raw/DeviceMouse.java` | `core/scene/tool/raw/DeviceMouse.js` | present |
| DeviceOldKeyboard | `de/jreality/toolsystem/raw/DeviceOldKeyboard.java` |  | missing |
| DeviceSpacenav | `de/jreality/toolsystem/raw/DeviceSpacenav.java` |  | missing |
| DeviceSystemTimer | `de/jreality/toolsystem/raw/DeviceSystemTimer.java` | `core/scene/tool/raw/DeviceSystemTimer.js` | present |
| PollingDevice | `de/jreality/toolsystem/raw/PollingDevice.java` | `core/scene/tool/raw/PollingDevice.js` | present |
| RawDevice | `de/jreality/toolsystem/raw/RawDevice.java` | `core/scene/tool/RawDevice.js` | present |
| WiiMoteOSC | `de/jreality/toolsystem/raw/WiiMoteOSC.java` |  | missing |
| SlotManager | `de/jreality/toolsystem/SlotManager.java` | `core/scene/tool/SlotManager.js` | present |
| ToolEvent | `de/jreality/toolsystem/ToolEvent.java` | `core/scene/tool/ToolEvent.js` | present |
| ToolEventQueue | `de/jreality/toolsystem/ToolEventQueue.java` | `core/scene/tool/ToolEventQueue.js` | present |
| ToolEventReceiver | `de/jreality/toolsystem/ToolEventReceiver.java` |  | missing |
| ToolManager | `de/jreality/toolsystem/ToolManager.java` | `core/scene/tool/ToolManager.js` | present |
| ToolSystem | `de/jreality/toolsystem/ToolSystem.java` | `core/scene/tool/ToolSystem.js` | present |
| ToolUpdateProxy | `de/jreality/toolsystem/ToolUpdateProxy.java` |  | missing |
| ToolUtility | `de/jreality/toolsystem/ToolUtility.java` | `core/scene/tool/ToolUtility.js` | present |
| OSCPool | `de/jreality/toolsystem/util/OSCPool.java` |  | missing |
| VirtualBumpAxis | `de/jreality/toolsystem/virtual/VirtualBumpAxis.java` |  | missing |
| VirtualClick | `de/jreality/toolsystem/virtual/VirtualClick.java` |  | missing |
| VirtualCoupledAxis | `de/jreality/toolsystem/virtual/VirtualCoupledAxis.java` | `core/scene/tool/virtual/VirtualCoupledAxis.js` | present |
| VirtualDoubleClick | `de/jreality/toolsystem/virtual/VirtualDoubleClick.java` | `core/scene/tool/virtual/VirtualDoubleClick.js` | present |
| VirtualEvolutionOperator | `de/jreality/toolsystem/virtual/VirtualEvolutionOperator.java` | `core/scene/tool/virtual/VirtualEvolutionOperator.js` | present |
| VirtualExtractAxis | `de/jreality/toolsystem/virtual/VirtualExtractAxis.java` | `core/scene/tool/virtual/VirtualExtractAxis.js` | present |
| VirtualExtractNegative | `de/jreality/toolsystem/virtual/VirtualExtractNegative.java` |  | missing |
| VirtualExtractPositive | `de/jreality/toolsystem/virtual/VirtualExtractPositive.java` |  | missing |
| VirtualExtractRotationTrafo | `de/jreality/toolsystem/virtual/VirtualExtractRotationTrafo.java` |  | missing |
| VirtualExtractTranslationTrafo | `de/jreality/toolsystem/virtual/VirtualExtractTranslationTrafo.java` | `core/scene/tool/virtual/VirtualExtractTranslationTrafo.js` | present |
| VirtualFilterAxis | `de/jreality/toolsystem/virtual/VirtualFilterAxis.java` |  | missing |
| VirtualFixedOnPressed | `de/jreality/toolsystem/virtual/VirtualFixedOnPressed.java` |  | missing |
| VirtualIntegrationOperator | `de/jreality/toolsystem/virtual/VirtualIntegrationOperator.java` |  | missing |
| VirtualInvertMatrix | `de/jreality/toolsystem/virtual/VirtualInvertMatrix.java` | `core/scene/tool/virtual/VirtualInvertMatrix.js` | present |
| VirtualMap | `de/jreality/toolsystem/virtual/VirtualMap.java` | `core/scene/tool/virtual/VirtualMap.js` | present |
| VirtualMergedAxis | `de/jreality/toolsystem/virtual/VirtualMergedAxis.java` | `core/scene/tool/virtual/VirtualMergedAxis.js` | present |
| VirtualMergedNDC | `de/jreality/toolsystem/virtual/VirtualMergedNDC.java` |  | missing |
| VirtualMousePointerTrafo | `de/jreality/toolsystem/virtual/VirtualMousePointerTrafo.java` | `core/scene/tool/virtual/VirtualMousePointerTrafo.js` | present |
| VirtualPortalRotation | `de/jreality/toolsystem/virtual/VirtualPortalRotation.java` |  | missing |
| VirtualProductMatrix | `de/jreality/toolsystem/virtual/VirtualProductMatrix.java` | `core/scene/tool/virtual/VirtualProductMatrix.js` | present |
| VirtualRawMousePointerTrafo | `de/jreality/toolsystem/virtual/VirtualRawMousePointerTrafo.java` | `core/scene/tool/virtual/VirtualRawMousePointerTrafo.js` | present |
| VirtualRepeater | `de/jreality/toolsystem/virtual/VirtualRepeater.java` |  | missing |
| VirtualReverseAxis | `de/jreality/toolsystem/virtual/VirtualReverseAxis.java` |  | missing |
| VirtualRotation | `de/jreality/toolsystem/virtual/VirtualRotation.java` | `core/scene/tool/virtual/VirtualRotation.js` | present |
| VirtualRotationAboutAxis | `de/jreality/toolsystem/virtual/VirtualRotationAboutAxis.java` |  | missing |
| VirtualRotationFromRxRyRz | `de/jreality/toolsystem/virtual/VirtualRotationFromRxRyRz.java` |  | missing |
| VirtualScaleAxis | `de/jreality/toolsystem/virtual/VirtualScaleAxis.java` |  | missing |
| VirtualSpaceNavigatorFixAxis | `de/jreality/toolsystem/virtual/VirtualSpaceNavigatorFixAxis.java` |  | missing |
| VirtualSpaceNavigatorFixAxisFirst | `de/jreality/toolsystem/virtual/VirtualSpaceNavigatorFixAxisFirst.java` |  | missing |
| VirtualSwitchAndInvertAxis | `de/jreality/toolsystem/virtual/VirtualSwitchAndInvertAxis.java` |  | missing |
| VirtualTimestepEvolution | `de/jreality/toolsystem/virtual/VirtualTimestepEvolution.java` |  | missing |
| VirtualToggleAxis | `de/jreality/toolsystem/virtual/VirtualToggleAxis.java` | `core/scene/tool/virtual/VirtualToggleAxis.js` | present |
| VirtualTranslationFromXYZ | `de/jreality/toolsystem/virtual/VirtualTranslationFromXYZ.java` |  | missing |
| VirtualDevice | `de/jreality/toolsystem/VirtualDevice.java` | `core/scene/tool/VirtualDevice.js` | present |
| VirtualDeviceContext | `de/jreality/toolsystem/VirtualDeviceContext.java` | `core/scene/tool/VirtualDeviceContext.js` | present |
